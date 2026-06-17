/**
 * REAPER live-OSC ingest (main process). Binds a UDP socket on a known port and
 * listens for `/track/N/name` feedback that REAPER emits using our shipped
 * `.ReaperOSC` pattern. The same socket sends `/action 41743` back to REAPER to
 * force a feedback re-send (the "Refresh" button).
 */

import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { networkInterfaces } from 'node:os';

import { encodeMessage, decodePacket, type OscArg } from '../osc/oscCodec';
import type {
  ReaperStatus,
  ReaperTrack,
  ReaperMonitor,
  ReaperMonitorEntry,
  ReaperSelfTest,
  ReaperSelfTestTarget,
} from '@shared/ipc/contract';

/** REAPER command: "Control surface: Refresh all surfaces" — re-sends feedback. */
const ACTION_REFRESH_SURFACES = 41743;

const TRACK_NAME_RE = /^\/track\/(\d+)\/name$/;
const SELECTED_TRACK_NAME = '/track/name';
const TRACK_NUMBER_RE = /^\/track\/(\d+)\/number\/str$/;
const SELECTED_TRACK_NUMBER = '/track/number/str';
const SELFTEST_ADDR = '/x32sync/selftest';

function summarizeArgs(args: OscArg[]): string {
  return args
    .map((a) => (a.value instanceof Buffer ? `blob[${a.value.length}]` : String(a.value)))
    .join(', ');
}

/** Every non-internal IPv4 address — the interfaces REAPER could be sending to. */
function lanIPv4Interfaces(): Array<{ name: string; ip: string }> {
  const out: Array<{ name: string; ip: string }> = [];
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push({ name, ip: ni.address });
    }
  }
  return out;
}

function parseTrackIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== 'string') return null;
  const m = /^\s*(\d+)/.exec(value);
  if (!m) return null;
  const index = parseInt(m[1], 10);
  return index > 0 ? index : null;
}

export interface ReaperConnectOptions {
  listenPort: number;
  reaperHost: string;
  reaperPort: number;
}

export class ReaperService extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private state: ReaperStatus['state'] = 'stopped';
  private message: string | undefined;
  private listenPort = 9000;
  private reaperHost = '127.0.0.1';
  private reaperPort = 8000;
  private readonly tracks = new Map<number, string>();
  private lastFeedbackAt: number | null = null;
  private packetsReceived = 0;
  private lastInboundAt: number | null = null;
  private readonly recent: ReaperMonitorEntry[] = [];
  private readonly inboundHosts = new Set<string>();
  private readonly trackNumberByDeviceIndex = new Map<number, number>();
  private monitorTimer: NodeJS.Timeout | null = null;
  private selfTestReceived: Set<string> | null = null;
  private selectedTrackIndex: number | null = null;

  getStatus(): ReaperStatus {
    return {
      state: this.state,
      message: this.message,
      listenPort: this.listenPort,
      reaperHost: this.reaperHost,
      reaperPort: this.reaperPort,
      trackCount: this.tracks.size,
      lastFeedbackAt: this.lastFeedbackAt,
      packetsReceived: this.packetsReceived,
      lastInboundAt: this.lastInboundAt,
    };
  }

  getMonitor(): ReaperMonitor {
    return { packetsReceived: this.packetsReceived, recent: [...this.recent] };
  }

  async start(opts: ReaperConnectOptions): Promise<ReaperStatus> {
    this.stop(true);
    this.listenPort = opts.listenPort;
    this.reaperHost = opts.reaperHost;
    this.reaperPort = opts.reaperPort;
    this.tracks.clear();
    this.lastFeedbackAt = null;
    this.packetsReceived = 0;
    this.lastInboundAt = null;
    this.recent.length = 0;
    this.inboundHosts.clear();
    this.trackNumberByDeviceIndex.clear();
    this.selectedTrackIndex = null;

    try {
      await this.bind();
      this.setState(
        'listening',
        `Listening on UDP ${this.listenPort}; refresh target ${this.reaperHost}:${this.reaperPort}`,
      );
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      const hint =
        e.code === 'EADDRINUSE'
          ? `Port ${this.listenPort} is already in use — change the Reaper listen port in Settings.`
          : e.message;
      this.setState('error', `Could not listen for Reaper: ${hint}`);
    }
    return this.getStatus();
  }

  stop(silent = false): void {
    if (this.monitorTimer) {
      clearTimeout(this.monitorTimer);
      this.monitorTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    if (silent) {
      this.state = 'stopped';
      this.message = undefined;
    } else {
      this.setState('stopped', 'Stopped');
    }
  }

  /** Ask REAPER to re-send all track-name feedback. */
  refresh(): { ok: boolean; trackCount: number } {
    if (!this.socket) return { ok: false, trackCount: this.tracks.size };
    this.sendToRefreshTargets(
      encodeMessage('/action', [{ type: 'i', value: ACTION_REFRESH_SURFACES }]),
    );
    return { ok: true, trackCount: this.tracks.size };
  }

  /**
   * Send a probe to our own listener on both loopback and the LAN interface, to
   * tell whether the receive path works (loopback) and whether the network port
   * is reachable (lan — a "no" almost always means a firewall is dropping it).
   */
  async selfTest(): Promise<ReaperSelfTest> {
    const interfaces = lanIPv4Interfaces();
    if (!this.socket) {
      return { loopback: false, targets: interfaces.map((i) => ({ ...i, label: i.name, received: false })) };
    }

    this.selfTestReceived = new Set();
    const sender = dgram.createSocket('udp4');
    await new Promise<void>((resolve) => sender.bind(0, () => resolve()));

    const probe = (tag: string, host: string): void => {
      sender.send(encodeMessage(SELFTEST_ADDR, [{ type: 's', value: tag }]), this.listenPort, host);
    };
    probe('loopback', '127.0.0.1');
    for (const iface of interfaces) probe(iface.ip, iface.ip);

    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      sender.close();
    } catch {
      /* ignore */
    }

    const received = this.selfTestReceived;
    this.selfTestReceived = null;
    const targets: ReaperSelfTestTarget[] = interfaces.map((i) => ({
      label: i.name,
      ip: i.ip,
      received: received.has(i.ip),
    }));
    return { loopback: received.has('loopback'), targets };
  }

  getTracks(): ReaperTrack[] {
    return [...this.tracks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, name]) => ({ index, name }));
  }

  configureRemote(reaperHost: string, reaperPort: number): void {
    this.reaperHost = reaperHost;
    this.reaperPort = reaperPort;
    this.emit('status', this.getStatus());
  }

  replaceTracks(tracks: ReaperTrack[]): void {
    this.tracks.clear();
    for (const track of tracks) {
      if (Number.isInteger(track.index) && track.index > 0) {
        this.tracks.set(track.index, track.name);
      }
    }
    this.lastFeedbackAt = Date.now();
    this.emit('tracks', this.getTracks());
    this.emit('status', this.getStatus());
  }

  // ---- internals ---------------------------------------------------------

  private bind(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // No reuseAddr: an exclusive bind surfaces a stray second instance as
      // EADDRINUSE instead of silently splitting inbound packets.
      const socket = dgram.createSocket('udp4');
      const onError = (err: Error): void => {
        socket.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = (): void => {
        socket.removeListener('error', onError);
        socket.on('error', (e) => this.onError(e));
        socket.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
        this.socket = socket;
        resolve();
      };
      socket.once('error', onError);
      socket.once('listening', onListening);
      socket.bind(this.listenPort);
    });
  }

  private onMessage(buf: Buffer, rinfo?: dgram.RemoteInfo): void {
    let messages;
    try {
      messages = decodePacket(buf);
    } catch {
      this.packetsReceived++;
      this.lastInboundAt = Date.now();
      this.pushRecent('(undecodable packet)', `${buf.length} bytes`);
      this.scheduleMonitor();
      return;
    }

    // Internal self-test packets are recorded separately, not counted as Reaper traffic.
    if (messages.length === 1 && messages[0].address === SELFTEST_ADDR) {
      const tag = messages[0].args[0]?.value;
      if (this.selfTestReceived && typeof tag === 'string') this.selfTestReceived.add(tag);
      return;
    }

    this.packetsReceived++;
    this.lastInboundAt = Date.now();
    if (rinfo?.address) this.inboundHosts.add(rinfo.address);

    let changed = false;
    for (const msg of messages) {
      if (msg.address === SELECTED_TRACK_NUMBER) {
        this.selectedTrackIndex = parseTrackIndex(msg.args[0]?.value);
        continue;
      }

      const numbered = TRACK_NUMBER_RE.exec(msg.address);
      if (numbered) {
        const deviceIndex = parseInt(numbered[1], 10);
        const trackIndex = parseTrackIndex(msg.args[0]?.value);
        if (trackIndex) this.trackNumberByDeviceIndex.set(deviceIndex, trackIndex);
      }
    }

    for (const msg of messages) {
      this.pushRecent(msg.address, summarizeArgs(msg.args));
      const index = this.trackIndexFromNameMessage(msg.address);
      if (!index || msg.args.length === 0) continue;
      const value = msg.args[0].value;
      if (typeof value !== 'string') continue;
      if (this.tracks.get(index) !== value) {
        this.tracks.set(index, value);
        changed = true;
      }
    }

    this.scheduleMonitor();
    if (changed) {
      this.lastFeedbackAt = Date.now();
      this.emit('tracks', this.getTracks());
      this.emit('status', this.getStatus());
    }
  }

  private pushRecent(addr: string, args: string): void {
    this.recent.unshift({ addr, args, at: Date.now() });
    if (this.recent.length > 25) this.recent.length = 25;
  }

  private trackIndexFromNameMessage(address: string): number | null {
    const numbered = TRACK_NAME_RE.exec(address);
    if (numbered) {
      const deviceIndex = parseInt(numbered[1], 10);
      return this.trackNumberByDeviceIndex.get(deviceIndex) ?? deviceIndex;
    }
    if (address === SELECTED_TRACK_NAME) return this.selectedTrackIndex;
    return null;
  }

  /** Throttle monitor emits so a refresh burst doesn't flood IPC. */
  private scheduleMonitor(): void {
    if (this.monitorTimer) return;
    this.monitorTimer = setTimeout(() => {
      this.monitorTimer = null;
      this.emit('monitor', this.getMonitor());
    }, 150);
  }

  private refreshTargetHosts(): string[] {
    const hosts = new Set<string>();
    if (this.reaperHost) hosts.add(this.reaperHost);
    for (const host of this.inboundHosts) hosts.add(host);

    // Before any inbound packet, we do not know whether REAPER's OSC listener is
    // bound to loopback or a LAN interface. Probe all local interfaces so Refresh
    // still works when REAPER was configured with "Local IP" = the LAN address.
    if (this.packetsReceived === 0) {
      hosts.add('127.0.0.1');
      for (const iface of lanIPv4Interfaces()) hosts.add(iface.ip);
    }

    return [...hosts];
  }

  private sendToRefreshTargets(buf: Buffer): void {
    for (const host of this.refreshTargetHosts()) {
      this.socket?.send(buf, this.reaperPort, host);
    }
  }

  private onError(err: Error): void {
    this.emit('log', { level: 'warn', message: `Reaper OSC socket: ${err.message}` });
  }

  private setState(state: ReaperStatus['state'], message?: string): void {
    this.state = state;
    this.message = message;
    this.emit('status', this.getStatus());
  }
}

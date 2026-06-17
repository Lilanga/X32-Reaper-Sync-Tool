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
} from '@shared/ipc/contract';

/** REAPER command: "Control surface: Refresh all surfaces" — re-sends feedback. */
const ACTION_REFRESH_SURFACES = 41743;

const TRACK_NAME_RE = /^\/track\/(\d+)\/name$/;
const SELFTEST_ADDR = '/x32sync/selftest';

function summarizeArgs(args: OscArg[]): string {
  return args
    .map((a) => (a.value instanceof Buffer ? `blob[${a.value.length}]` : String(a.value)))
    .join(', ');
}

/** First non-internal IPv4 address — the interface REAPER would send to over the LAN. */
function firstLanIPv4(): string | null {
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return null;
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
  private monitorTimer: NodeJS.Timeout | null = null;
  private selfTestState: { loopback: boolean; lan: boolean } | null = null;

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

    try {
      await this.bind();
      this.setState('listening', `Listening on UDP ${this.listenPort}`);
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
    this.send(encodeMessage('/action', [{ type: 'i', value: ACTION_REFRESH_SURFACES }]));
    return { ok: true, trackCount: this.tracks.size };
  }

  /**
   * Send a probe to our own listener on both loopback and the LAN interface, to
   * tell whether the receive path works (loopback) and whether the network port
   * is reachable (lan — a "no" almost always means a firewall is dropping it).
   */
  async selfTest(): Promise<ReaperSelfTest> {
    const lanIp = firstLanIPv4();
    if (!this.socket) return { loopback: false, lan: false, lanIp };

    this.selfTestState = { loopback: false, lan: false };
    const sender = dgram.createSocket('udp4');
    await new Promise<void>((resolve) => sender.bind(0, () => resolve()));

    const probe = (which: string, host: string): void => {
      sender.send(encodeMessage(SELFTEST_ADDR, [{ type: 's', value: which }]), this.listenPort, host);
    };
    probe('loopback', '127.0.0.1');
    if (lanIp) probe('lan', lanIp);

    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      sender.close();
    } catch {
      /* ignore */
    }

    const result: ReaperSelfTest = {
      loopback: this.selfTestState.loopback,
      lan: this.selfTestState.lan,
      lanIp,
    };
    this.selfTestState = null;
    return result;
  }

  getTracks(): ReaperTrack[] {
    return [...this.tracks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, name]) => ({ index, name }));
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
        socket.on('message', (msg) => this.onMessage(msg));
        this.socket = socket;
        resolve();
      };
      socket.once('error', onError);
      socket.once('listening', onListening);
      socket.bind(this.listenPort);
    });
  }

  private onMessage(buf: Buffer): void {
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
      const which = messages[0].args[0]?.value;
      if (this.selfTestState && typeof which === 'string') {
        if (which === 'loopback') this.selfTestState.loopback = true;
        else if (which === 'lan') this.selfTestState.lan = true;
      }
      return;
    }

    this.packetsReceived++;
    this.lastInboundAt = Date.now();

    let changed = false;
    for (const msg of messages) {
      this.pushRecent(msg.address, summarizeArgs(msg.args));
      const m = TRACK_NAME_RE.exec(msg.address);
      if (!m || msg.args.length === 0) continue;
      const value = msg.args[0].value;
      if (typeof value !== 'string') continue;
      const index = parseInt(m[1], 10);
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

  /** Throttle monitor emits so a refresh burst doesn't flood IPC. */
  private scheduleMonitor(): void {
    if (this.monitorTimer) return;
    this.monitorTimer = setTimeout(() => {
      this.monitorTimer = null;
      this.emit('monitor', this.getMonitor());
    }, 150);
  }

  private send(buf: Buffer): void {
    this.socket?.send(buf, this.reaperPort, this.reaperHost);
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

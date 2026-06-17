/**
 * REAPER live-OSC ingest (main process). Binds a UDP socket on a known port and
 * listens for `/track/N/name` feedback that REAPER emits using our shipped
 * `.ReaperOSC` pattern. The same socket sends `/action 41743` back to REAPER to
 * force a feedback re-send (the "Refresh" button).
 */

import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';

import { encodeMessage, decodePacket } from '../osc/oscCodec';
import type { ReaperStatus, ReaperTrack } from '@shared/ipc/contract';

/** REAPER command: "Control surface: Refresh all surfaces" — re-sends feedback. */
const ACTION_REFRESH_SURFACES = 41743;

const TRACK_NAME_RE = /^\/track\/(\d+)\/name$/;

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

  getStatus(): ReaperStatus {
    return {
      state: this.state,
      message: this.message,
      listenPort: this.listenPort,
      reaperHost: this.reaperHost,
      reaperPort: this.reaperPort,
      trackCount: this.tracks.size,
      lastFeedbackAt: this.lastFeedbackAt,
    };
  }

  async start(opts: ReaperConnectOptions): Promise<ReaperStatus> {
    this.stop(true);
    this.listenPort = opts.listenPort;
    this.reaperHost = opts.reaperHost;
    this.reaperPort = opts.reaperPort;
    this.tracks.clear();
    this.lastFeedbackAt = null;

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

  getTracks(): ReaperTrack[] {
    return [...this.tracks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, name]) => ({ index, name }));
  }

  // ---- internals ---------------------------------------------------------

  private bind(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
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
      return;
    }
    let changed = false;
    for (const msg of messages) {
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
    if (changed) {
      this.lastFeedbackAt = Date.now();
      this.emit('tracks', this.getTracks());
      this.emit('status', this.getStatus());
    }
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

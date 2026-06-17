/**
 * X32/M32 OSC client (main process). Owns one UDP socket bound to an ephemeral
 * local port and talks to the console (or the simulator) at host:10023.
 *
 * Responsibilities:
 *  - connection lifecycle with an `/xinfo` probe and latency measurement
 *  - `/xremote` heartbeat (renewed every 6 s) so the console pushes live edits
 *  - correlated reads (RequestCorrelator) with one retry per dropped UDP packet
 *  - paced, coalescing writes (WriteQueue)
 */

import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';

import { BANKS, type BankId, type StripField } from '@shared/x32/banks';
import { nameAddr, colorAddr, iconAddr, addrForField, parseAddr } from '@shared/x32/address';
import { clampColor } from '@shared/x32/colors';
import { clampIcon } from '@shared/x32/icons';
import { sanitizeName } from '@shared/validation/name';
import type { ChannelStripValue } from '@shared/model/channelStrip';
import type {
  ConnectionState,
  ConnectionStatus,
  ReadBankResult,
  PushBankResult,
  PushStripResult,
} from '@shared/ipc/contract';

import {
  encodeMessage,
  decodePacket,
  firstArgValue,
  type OscArg,
  type OscMessage,
} from './oscCodec';
import { RequestCorrelator } from './RequestCorrelator';
import { WriteQueue } from './WriteQueue';

const XREMOTE_INTERVAL_MS = 6000;
const PING_INTERVAL_MS = 5000;
const READ_TIMEOUT_MS = 800;
const READ_CONCURRENCY = 8;

interface Target {
  host: string;
  port: number;
}

interface ReadTarget {
  addr: string;
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

function numberOr(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

export interface PushStripRequest {
  bankId: BankId;
  index: number;
  name?: string;
  color?: number;
  icon?: number;
}

export class X32Client extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private target: Target | null = null;
  private state: ConnectionState = 'disconnected';
  private message: string | undefined;
  private simulator = false;
  private latencyMs: number | undefined;
  private model: string | undefined;
  private firmware: string | undefined;

  private readonly correlator = new RequestCorrelator();
  private readonly queue: WriteQueue;
  private xremoteTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.queue = new WriteQueue((buf) => this.rawSend(buf), 20);
  }

  getStatus(): ConnectionStatus {
    return {
      state: this.state,
      message: this.message,
      latencyMs: this.latencyMs,
      model: this.model,
      firmware: this.firmware,
      ip: this.target?.host,
      simulator: this.simulator,
    };
  }

  async connect(host: string, port: number, simulator = false): Promise<ConnectionStatus> {
    this.disconnect(true);
    this.simulator = simulator;
    this.target = { host, port };
    this.model = undefined;
    this.firmware = undefined;
    this.latencyMs = undefined;
    this.setState('connecting', simulator ? 'Connecting to simulator…' : `Connecting to ${host}…`);

    try {
      await this.openSocket();
    } catch (err) {
      this.setState('error', `Could not open UDP socket: ${(err as Error).message}`);
      return this.getStatus();
    }

    try {
      const started = Date.now();
      const info = await this.request('/xinfo', [], simulator ? 1500 : 2500);
      this.latencyMs = Date.now() - started;
      this.applyXinfo(info);
      this.setState(
        'connected',
        simulator ? 'Connected to simulator' : `Connected to ${host}`,
      );
      this.startXremote();
      this.startPings();
    } catch {
      this.disconnect(true);
      this.setState(
        'error',
        simulator
          ? 'Simulator did not respond. Toggle simulator off and on, then reconnect.'
          : 'No response from the console. Check the IP and that the X32 is reachable over Ethernet/Wi-Fi — the X-USB card cannot carry control data.',
      );
    }
    return this.getStatus();
  }

  disconnect(silent = false): void {
    this.stopTimers();
    this.queue.clear();
    this.correlator.rejectAll(new Error('disconnected'));
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.target = null;
    if (silent) {
      this.state = 'disconnected';
      this.message = undefined;
    } else {
      this.setState('disconnected', 'Disconnected');
    }
  }

  async readBank(bankId: BankId, fields: StripField[]): Promise<ReadBankResult> {
    const bank = BANKS[bankId];
    const targets: ReadTarget[] = [];
    for (let i = 1; i <= bank.count; i++) {
      for (const field of fields) {
        targets.push({ addr: addrForField(bankId, i, field) });
      }
    }
    const { values, unresolved } = await this.readValues(targets);
    const strips: ChannelStripValue[] = [];
    for (let i = 1; i <= bank.count; i++) {
      strips.push(this.assembleStrip(bankId, i, values));
    }
    return { strips, unresolved };
  }

  async readStrip(
    bankId: BankId,
    index: number,
    fields: StripField[] = ['name', 'color', 'icon'],
  ): Promise<{ strip: ChannelStripValue }> {
    const targets = fields.map((field) => ({ addr: addrForField(bankId, index, field) }));
    const { values } = await this.readValues(targets);
    return { strip: this.assembleStrip(bankId, index, values) };
  }

  pushStrip(req: PushStripRequest): PushStripResult {
    if (this.state !== 'connected' && this.state !== 'degraded') {
      return { ok: false };
    }
    let truncated = false;
    if (req.name !== undefined) {
      const sanitized = sanitizeName(req.name);
      truncated = truncated || sanitized.truncated;
      const addr = nameAddr(req.bankId, req.index);
      this.queue.enqueue(addr, encodeMessage(addr, [{ type: 's', value: sanitized.name }]));
    }
    if (req.color !== undefined) {
      const addr = colorAddr(req.bankId, req.index);
      this.queue.enqueue(addr, encodeMessage(addr, [{ type: 'i', value: clampColor(req.color) }]));
    }
    if (req.icon !== undefined) {
      const addr = iconAddr(req.bankId, req.index);
      this.queue.enqueue(addr, encodeMessage(addr, [{ type: 'i', value: clampIcon(req.icon) }]));
    }
    return { ok: true, truncated };
  }

  pushBank(
    bankId: BankId,
    strips: ChannelStripValue[],
    fields: StripField[] = ['name'],
  ): PushBankResult {
    const perStrip = strips.map((strip) => {
      const result = this.pushStrip({
        bankId,
        index: strip.index,
        name: fields.includes('name') ? strip.name : undefined,
        color: fields.includes('color') ? strip.color : undefined,
        icon: fields.includes('icon') ? strip.icon : undefined,
      });
      return { index: strip.index, ok: result.ok, truncated: result.truncated };
    });
    return { ok: perStrip.every((p) => p.ok), perStrip };
  }

  // ---- internals ---------------------------------------------------------

  private openSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      const onError = (err: Error): void => {
        socket.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = (): void => {
        socket.removeListener('error', onError);
        socket.on('error', (e) => this.onSocketError(e));
        socket.on('message', (msg) => this.onMessage(msg));
        this.socket = socket;
        resolve();
      };
      socket.once('error', onError);
      socket.once('listening', onListening);
      socket.bind(0); // ephemeral local port avoids EADDRINUSE on the console socket
    });
  }

  private onSocketError(err: Error): void {
    // UDP errors (e.g. Windows ICMP port-unreachable → ECONNRESET) are logged but
    // do not by themselves tear down the session; liveness is governed by pings.
    this.emit('log', { level: 'warn', message: `OSC socket: ${err.message}` });
  }

  private onMessage(buf: Buffer): void {
    let messages: OscMessage[];
    try {
      messages = decodePacket(buf);
    } catch {
      return;
    }
    for (const msg of messages) {
      if (!this.correlator.resolve(msg)) {
        this.handleUnsolicited(msg);
      }
    }
  }

  private handleUnsolicited(msg: OscMessage): void {
    const parsed = parseAddr(msg.address);
    if (!parsed) return;
    const value = firstArgValue(msg);
    if (value === undefined || value instanceof Buffer) return;
    this.emit('changed', {
      bankId: parsed.bankId,
      index: parsed.index,
      field: parsed.field,
      value,
    });
  }

  private async readValues(
    targets: ReadTarget[],
  ): Promise<{ values: Map<string, string | number>; unresolved: string[] }> {
    const values = new Map<string, string | number>();
    const unresolved: string[] = [];
    await runPool(targets, READ_CONCURRENCY, async (t) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const reply = await this.request(t.addr, [], READ_TIMEOUT_MS);
          const v = firstArgValue(reply);
          values.set(t.addr, typeof v === 'number' ? v : String(v ?? ''));
          return;
        } catch {
          if (attempt === 1) unresolved.push(t.addr);
        }
      }
    });
    return { values, unresolved };
  }

  private assembleStrip(
    bankId: BankId,
    index: number,
    values: Map<string, string | number>,
  ): ChannelStripValue {
    return {
      bankId,
      index,
      name: String(values.get(nameAddr(bankId, index)) ?? ''),
      color: numberOr(values.get(colorAddr(bankId, index)), 0),
      icon: numberOr(values.get(iconAddr(bankId, index)), 1),
    };
  }

  private request(address: string, args: OscArg[] = [], timeoutMs = READ_TIMEOUT_MS): Promise<OscMessage> {
    const pending = this.correlator.await(address, timeoutMs);
    this.rawSend(encodeMessage(address, args));
    return pending;
  }

  private rawSend(buf: Buffer): void {
    if (!this.socket || !this.target) return;
    this.socket.send(buf, this.target.port, this.target.host, (err) => {
      if (err) this.onSocketError(err);
    });
  }

  private applyXinfo(info: OscMessage): void {
    // /xinfo replies with [serverIp, serverName, model, firmware].
    const vals = info.args.map((a) => (a.value instanceof Buffer ? '' : String(a.value)));
    if (vals.length >= 4) {
      this.model = vals[2];
      this.firmware = vals[3];
    } else if (vals.length >= 1) {
      this.model = vals[vals.length - 1];
    }
  }

  private startXremote(): void {
    this.sendXremote();
    this.xremoteTimer = setInterval(() => this.sendXremote(), XREMOTE_INTERVAL_MS);
  }

  private sendXremote(): void {
    this.rawSend(encodeMessage('/xremote', []));
  }

  private startPings(): void {
    this.pingTimer = setInterval(() => void this.ping(), PING_INTERVAL_MS);
  }

  private async ping(): Promise<void> {
    const started = Date.now();
    try {
      await this.request('/xinfo', [], 1500);
      this.latencyMs = Date.now() - started;
      if (this.state === 'degraded') {
        this.setState(
          'connected',
          this.simulator ? 'Connected to simulator' : `Connected to ${this.target?.host ?? ''}`,
        );
      } else {
        this.emitStatus();
      }
    } catch {
      this.latencyMs = undefined;
      if (this.state === 'connected') {
        this.setState('degraded', 'No response from console (retrying)…');
      }
    }
  }

  private stopTimers(): void {
    if (this.xremoteTimer) {
      clearInterval(this.xremoteTimer);
      this.xremoteTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private setState(state: ConnectionState, message?: string): void {
    this.state = state;
    this.message = message;
    this.emitStatus();
  }

  private emitStatus(): void {
    this.emit('status', this.getStatus());
  }
}

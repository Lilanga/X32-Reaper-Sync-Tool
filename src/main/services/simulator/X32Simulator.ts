/**
 * In-process X32 simulator: a loopback UDP responder that emulates the console's
 * OSC behaviour so the entire app is testable without hardware.
 *
 *  - GET  (address, no args)      → replies with the stored value
 *  - SET  (address + 1 arg)       → stores it, truncating names to 12 chars like
 *                                   the real desk, then echoes to /xremote clients
 *  - /xinfo                       → replies with a fake "X32SIM" identity
 *  - /xremote                     → registers the sender for change pushes
 */

import dgram from 'node:dgram';

import { BANKS, BANK_ORDER, type StripField } from '@shared/x32/banks';
import { nameAddr, colorAddr, iconAddr, addrForField, parseAddr } from '@shared/x32/address';
import { sanitizeName } from '@shared/validation/name';
import { clampColor } from '@shared/x32/colors';
import { clampIcon } from '@shared/x32/icons';

import { encodeMessage, decodePacket, type OscArg } from '../osc/oscCodec';

const CH_SEED = [
  'Kick In', 'Kick Out', 'Snare T', 'Snare B', 'Hi-Hat', 'Tom 1', 'Tom 2', 'Floor Tom',
  'OH L', 'OH R', 'Bass DI', 'Bass Amp', 'Gtr 1', 'Gtr 2', 'Ac Gtr', 'Keys L',
  'Keys R', 'Lead Vox', 'BV 1', 'BV 2', 'BV 3', 'Sax', 'Trumpet', 'Trombone',
  'Perc', 'Track L', 'Track R', 'Click', 'Talkback', 'Amb L', 'Amb R', 'Spare',
];

interface RemoteInfo {
  address: string;
  port: number;
}

interface XremoteClient {
  host: string;
  port: number;
  expires: number;
}

function argFor(field: StripField, value: string | number): OscArg {
  if (field === 'name') return { type: 's', value: String(value) };
  return { type: 'i', value: Number(value) };
}

export class X32Simulator {
  private socket: dgram.Socket | null = null;
  private readonly store = new Map<string, string | number>();
  private readonly xremoteClients = new Map<string, XremoteClient>();

  constructor(private readonly port = 10023) {
    this.seed();
  }

  get running(): boolean {
    return this.socket !== null;
  }

  start(): Promise<void> {
    if (this.socket) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      socket.once('error', reject);
      socket.once('listening', () => {
        socket.removeListener('error', reject);
        socket.on('error', () => {
          /* swallow transient loopback errors */
        });
        socket.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
        this.socket = socket;
        resolve();
      });
      socket.bind(this.port, '127.0.0.1');
    });
  }

  stop(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.xremoteClients.clear();
  }

  /** Reset the store back to seeded values (useful for tests). */
  reseed(): void {
    this.store.clear();
    this.seed();
  }

  private seed(): void {
    for (const bankId of BANK_ORDER) {
      const bank = BANKS[bankId];
      for (let i = 1; i <= bank.count; i++) {
        const name =
          bankId === 'ch'
            ? CH_SEED[i - 1] ?? `Ch ${i}`
            : bank.count === 1
              ? bank.short
              : `${bank.short} ${i}`;
        this.store.set(nameAddr(bankId, i), sanitizeName(name).name);
        this.store.set(colorAddr(bankId, i), i % 8);
        this.store.set(iconAddr(bankId, i), ((i - 1) % 74) + 1);
      }
    }
  }

  private onMessage(buf: Buffer, rinfo: RemoteInfo): void {
    let messages;
    try {
      messages = decodePacket(buf);
    } catch {
      return;
    }

    for (const msg of messages) {
      if (msg.address === '/xinfo') {
        this.reply(rinfo, '/xinfo', [
          { type: 's', value: '127.0.0.1' },
          { type: 's', value: 'X32-SIM' },
          { type: 's', value: 'X32SIM' },
          { type: 's', value: '4.06-sim' },
        ]);
        continue;
      }
      if (msg.address === '/xremote') {
        this.xremoteClients.set(`${rinfo.address}:${rinfo.port}`, {
          host: rinfo.address,
          port: rinfo.port,
          expires: Date.now() + 10_000,
        });
        continue;
      }

      const parsed = parseAddr(msg.address);
      if (!parsed) continue;

      if (msg.args.length === 0) {
        // GET
        const fallback: string | number = parsed.field === 'name' ? '' : parsed.field === 'icon' ? 1 : 0;
        const value = this.store.get(msg.address) ?? fallback;
        this.reply(rinfo, msg.address, [argFor(parsed.field, value)]);
      } else {
        // SET
        let value = msg.args[0].value;
        if (value instanceof Buffer) continue;
        if (parsed.field === 'name') value = sanitizeName(String(value)).name;
        else if (parsed.field === 'color') value = clampColor(Number(value));
        else value = clampIcon(Number(value));
        this.store.set(msg.address, value);
        this.broadcastChange(addrForField(parsed.bankId, parsed.index, parsed.field), parsed.field, value);
      }
    }
  }

  private broadcastChange(address: string, field: StripField, value: string | number): void {
    const now = Date.now();
    for (const [key, client] of this.xremoteClients) {
      if (client.expires < now) {
        this.xremoteClients.delete(key);
        continue;
      }
      this.send(client.host, client.port, address, [argFor(field, value)]);
    }
  }

  private reply(rinfo: RemoteInfo, address: string, args: OscArg[]): void {
    this.send(rinfo.address, rinfo.port, address, args);
  }

  private send(host: string, port: number, address: string, args: OscArg[]): void {
    if (!this.socket) return;
    this.socket.send(encodeMessage(address, args), port, host);
  }
}

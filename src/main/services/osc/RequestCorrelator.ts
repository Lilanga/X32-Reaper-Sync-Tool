/**
 * The X32 OSC protocol has no request IDs: a read is "send an address with no
 * args; the console replies to your port with that same address + value". We
 * therefore correlate replies to pending reads by **address string**, FIFO, so
 * overlapping reads of the same address still resolve in order.
 */

import type { OscMessage } from './oscCodec';

interface Pending {
  resolve: (msg: OscMessage) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class RequestCorrelator {
  private pending = new Map<string, Pending[]>();

  /** Register interest in the next reply for `address`, rejecting after `timeoutMs`. */
  await(address: string, timeoutMs: number): Promise<OscMessage> {
    return new Promise<OscMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        const arr = this.pending.get(address);
        if (arr) {
          const idx = arr.findIndex((p) => p.timer === timer);
          if (idx >= 0) arr.splice(idx, 1);
          if (arr.length === 0) this.pending.delete(address);
        }
        reject(new Error(`OSC read timeout: ${address}`));
      }, timeoutMs);

      const arr = this.pending.get(address) ?? [];
      arr.push({ resolve, reject, timer });
      this.pending.set(address, arr);
    });
  }

  /** Try to satisfy a pending read with an inbound message. Returns true if matched. */
  resolve(msg: OscMessage): boolean {
    const arr = this.pending.get(msg.address);
    if (!arr || arr.length === 0) return false;
    const p = arr.shift()!;
    if (arr.length === 0) this.pending.delete(msg.address);
    clearTimeout(p.timer);
    p.resolve(msg);
    return true;
  }

  /** Reject every outstanding read (e.g. on disconnect). */
  rejectAll(err: Error): void {
    for (const arr of this.pending.values()) {
      for (const p of arr) {
        clearTimeout(p.timer);
        p.reject(err);
      }
    }
    this.pending.clear();
  }

  get size(): number {
    let n = 0;
    for (const arr of this.pending.values()) n += arr.length;
    return n;
  }
}

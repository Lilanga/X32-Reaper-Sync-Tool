/**
 * Paced, coalescing outbound queue for OSC sets. The X32 can be overrun if you
 * blast 32+ parameter changes instantly, so we drain one packet every `gapMs`
 * (~50 msg/s). Sets are keyed by OSC address and **coalesced last-write-wins**,
 * which matters for auto-sync where Reaper may emit rapid edits to one strip.
 */

export class WriteQueue {
  private payloads = new Map<string, Buffer>();
  private order: string[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly sender: (buf: Buffer) => void,
    private readonly gapMs = 20,
  ) {}

  enqueue(address: string, buf: Buffer): void {
    if (!this.payloads.has(address)) this.order.push(address);
    this.payloads.set(address, buf); // coalesce: newest wins
    this.kick();
  }

  private kick(): void {
    if (this.timer) return;
    this.drainOne();
    this.timer = setInterval(() => this.drainOne(), this.gapMs);
  }

  private drainOne(): void {
    const address = this.order.shift();
    if (address === undefined) {
      this.stopTimer();
      return;
    }
    const buf = this.payloads.get(address);
    this.payloads.delete(address);
    if (buf) this.sender(buf);
    if (this.order.length === 0) this.stopTimer();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  clear(): void {
    this.payloads.clear();
    this.order = [];
    this.stopTimer();
  }

  get pending(): number {
    return this.order.length;
  }
}

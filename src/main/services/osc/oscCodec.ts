/**
 * Minimal, dependency-free OSC 1.0 codec covering exactly what the X32 needs:
 * messages with string / int32 / float32 / blob arguments, plus decoding of
 * `#bundle` packets (the console batches `/xremote` updates in bundles).
 *
 * Encoding/decoding is pure and fully unit-tested; the socket layer wraps
 * `decodePacket` in try/catch so malformed UDP never throws.
 */

export type OscType = 's' | 'i' | 'f' | 'b';

export interface OscArg {
  type: OscType;
  value: string | number | Buffer;
}

export interface OscMessage {
  address: string;
  args: OscArg[];
}

/** OSC strings: content + at least one NUL, padded with NULs to a 4-byte boundary. */
function encodeString(value: string): Buffer {
  const body = Buffer.from(value, 'ascii');
  const nulls = 4 - (body.length % 4); // 1..4 (guarantees a terminator)
  return Buffer.concat([body, Buffer.alloc(nulls)]);
}

function encodeBlob(blob: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeInt32BE(blob.length, 0);
  const pad = (4 - (blob.length % 4)) % 4;
  return Buffer.concat([size, blob, Buffer.alloc(pad)]);
}

export function encodeMessage(address: string, args: OscArg[] = []): Buffer {
  const parts: Buffer[] = [encodeString(address)];
  let typeTag = ',';
  const argBufs: Buffer[] = [];

  for (const arg of args) {
    typeTag += arg.type;
    switch (arg.type) {
      case 's': {
        argBufs.push(encodeString(String(arg.value)));
        break;
      }
      case 'i': {
        const b = Buffer.alloc(4);
        b.writeInt32BE(Number(arg.value) | 0, 0);
        argBufs.push(b);
        break;
      }
      case 'f': {
        const b = Buffer.alloc(4);
        b.writeFloatBE(Number(arg.value), 0);
        argBufs.push(b);
        break;
      }
      case 'b': {
        argBufs.push(encodeBlob(arg.value as Buffer));
        break;
      }
    }
  }

  parts.push(encodeString(typeTag));
  return Buffer.concat([...parts, ...argBufs]);
}

interface StringRead {
  value: string;
  next: number;
}

function readString(buf: Buffer, offset: number): StringRead {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end++;
  const value = buf.toString('ascii', offset, end);
  // Advance past the terminator to the next 4-byte boundary (fields start aligned).
  let next = end + 1;
  if (next % 4 !== 0) next += 4 - (next % 4);
  return { value, next };
}

function decodeMessage(buf: Buffer, start: number, end: number): OscMessage {
  const addr = readString(buf, start);
  let off = addr.next;
  const args: OscArg[] = [];

  if (off < end && buf[off] === 0x2c /* ',' */) {
    const tagRead = readString(buf, off);
    off = tagRead.next;
    const tags = tagRead.value.slice(1); // drop leading ','

    for (const tag of tags) {
      if (off > end) break;
      switch (tag) {
        case 's': {
          const r = readString(buf, off);
          off = r.next;
          args.push({ type: 's', value: r.value });
          break;
        }
        case 'i': {
          args.push({ type: 'i', value: buf.readInt32BE(off) });
          off += 4;
          break;
        }
        case 'f': {
          args.push({ type: 'f', value: buf.readFloatBE(off) });
          off += 4;
          break;
        }
        case 'b': {
          const size = buf.readInt32BE(off);
          off += 4;
          const blob = buf.subarray(off, off + size);
          off += size + ((4 - (size % 4)) % 4);
          args.push({ type: 'b', value: blob });
          break;
        }
        case 'T': {
          args.push({ type: 'i', value: 1 });
          break;
        }
        case 'F': {
          args.push({ type: 'i', value: 0 });
          break;
        }
        default: {
          // Unknown tag: stop parsing args to avoid misaligned reads.
          return { address: addr.value, args };
        }
      }
    }
  }

  return { address: addr.value, args };
}

const BUNDLE_TAG = '#bundle';

function isBundle(buf: Buffer, start: number, end: number): boolean {
  return end - start >= 8 && buf.toString('ascii', start, start + 7) === BUNDLE_TAG;
}

function decodeBundle(buf: Buffer, start: number, end: number, out: OscMessage[]): void {
  let off = start + 8; // '#bundle\0'
  off += 8; // 64-bit OSC time tag (ignored)
  while (off + 4 <= end) {
    const size = buf.readInt32BE(off);
    off += 4;
    const elemStart = off;
    const elemEnd = Math.min(off + size, end);
    if (isBundle(buf, elemStart, elemEnd)) {
      decodeBundle(buf, elemStart, elemEnd, out);
    } else if (elemEnd > elemStart) {
      out.push(decodeMessage(buf, elemStart, elemEnd));
    }
    off = elemEnd;
  }
}

/** Decode a UDP datagram into a flat list of OSC messages (unwrapping bundles). */
export function decodePacket(buf: Buffer): OscMessage[] {
  if (isBundle(buf, 0, buf.length)) {
    const out: OscMessage[] = [];
    decodeBundle(buf, 0, buf.length, out);
    return out;
  }
  return [decodeMessage(buf, 0, buf.length)];
}

/** Convenience for reading the first argument's value (X32 single-value replies). */
export function firstArgValue(msg: OscMessage): string | number | Buffer | undefined {
  return msg.args.length ? msg.args[0].value : undefined;
}

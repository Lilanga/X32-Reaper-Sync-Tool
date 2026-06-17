import { describe, it, expect } from 'vitest';
import { encodeMessage, decodePacket } from '@main/services/osc/oscCodec';

describe('oscCodec', () => {
  it('round-trips a string message', () => {
    const buf = encodeMessage('/ch/01/config/name', [{ type: 's', value: 'Kick' }]);
    // 4-byte alignment for every field
    expect(buf.length % 4).toBe(0);
    const [msg] = decodePacket(buf);
    expect(msg.address).toBe('/ch/01/config/name');
    expect(msg.args).toEqual([{ type: 's', value: 'Kick' }]);
  });

  it('round-trips a GET (no args)', () => {
    const buf = encodeMessage('/ch/05/config/name', []);
    const [msg] = decodePacket(buf);
    expect(msg.address).toBe('/ch/05/config/name');
    expect(msg.args).toHaveLength(0);
  });

  it('round-trips an int message', () => {
    const buf = encodeMessage('/ch/02/config/color', [{ type: 'i', value: 4 }]);
    const [msg] = decodePacket(buf);
    expect(msg.address).toBe('/ch/02/config/color');
    expect(msg.args[0]).toEqual({ type: 'i', value: 4 });
  });

  it('pads strings whose length is a multiple of 4 with a full 4 NULs', () => {
    // "Kick" is 4 bytes → needs 4 NUL bytes of padding (one terminator + 3).
    const buf = encodeMessage('/x', [{ type: 's', value: 'Kick' }]);
    const [msg] = decodePacket(buf);
    expect(msg.args[0].value).toBe('Kick');
  });

  it('decodes a #bundle of two messages', () => {
    const a = encodeMessage('/ch/01/config/name', [{ type: 's', value: 'Vox' }]);
    const b = encodeMessage('/ch/02/config/name', [{ type: 's', value: 'Bass' }]);
    const sizeA = Buffer.alloc(4);
    sizeA.writeInt32BE(a.length, 0);
    const sizeB = Buffer.alloc(4);
    sizeB.writeInt32BE(b.length, 0);
    const header = Buffer.from('#bundle\0', 'ascii');
    const timetag = Buffer.alloc(8);
    const bundle = Buffer.concat([header, timetag, sizeA, a, sizeB, b]);

    const msgs = decodePacket(bundle);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toEqual({ address: '/ch/01/config/name', args: [{ type: 's', value: 'Vox' }] });
    expect(msgs[1]).toEqual({
      address: '/ch/02/config/name',
      args: [{ type: 's', value: 'Bass' }],
    });
  });
});

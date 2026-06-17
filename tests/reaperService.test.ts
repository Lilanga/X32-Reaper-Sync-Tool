import { describe, it, expect, afterEach } from 'vitest';
import dgram from 'node:dgram';

import { ReaperService } from '@main/services/reaper/ReaperService';
import { encodeMessage, decodePacket } from '@main/services/osc/oscCodec';

const LISTEN = 9123;
const REAPER = 8123;

describe('ReaperService', () => {
  let svc: ReaperService | undefined;
  let extra: dgram.Socket | undefined;

  afterEach(() => {
    svc?.stop(true);
    try {
      extra?.close();
    } catch {
      /* ignore */
    }
    svc = undefined;
    extra = undefined;
  });

  it('ingests /track/N/name feedback from Reaper', async () => {
    svc = new ReaperService();
    const status = await svc.start({
      listenPort: LISTEN,
      reaperHost: '127.0.0.1',
      reaperPort: REAPER,
    });
    expect(status.state).toBe('listening');

    const sender = dgram.createSocket('udp4');
    extra = sender;

    const firstTracks = new Promise((resolve) => svc!.once('tracks', resolve));
    sender.send(encodeMessage('/track/1/name', [{ type: 's', value: 'Lead Vox' }]), LISTEN, '127.0.0.1');
    sender.send(encodeMessage('/track/2/name', [{ type: 's', value: 'Bass' }]), LISTEN, '127.0.0.1');
    await firstTracks;
    await new Promise((r) => setTimeout(r, 40));

    const tracks = svc.getTracks();
    expect(tracks.find((t) => t.index === 1)?.name).toBe('Lead Vox');
    expect(tracks.find((t) => t.index === 2)?.name).toBe('Bass');

    // The diagnostics monitor counts every inbound datagram and records addresses.
    expect(svc.getStatus().packetsReceived).toBeGreaterThanOrEqual(2);
    expect(svc.getMonitor().recent.some((e) => e.addr === '/track/1/name')).toBe(true);
  });

  it('refresh() sends /action 41743 to Reaper', async () => {
    const reaper = dgram.createSocket('udp4');
    extra = reaper;
    await new Promise<void>((resolve) => reaper.bind(REAPER, '127.0.0.1', () => resolve()));
    const received = new Promise<Buffer>((resolve) => reaper.once('message', (m) => resolve(m)));

    svc = new ReaperService();
    await svc.start({ listenPort: LISTEN, reaperHost: '127.0.0.1', reaperPort: REAPER });

    const r = svc.refresh();
    expect(r.ok).toBe(true);

    const buf = await received;
    const [msg] = decodePacket(buf);
    expect(msg.address).toBe('/action');
    expect(msg.args[0]).toEqual({ type: 'i', value: 41743 });
  });
});

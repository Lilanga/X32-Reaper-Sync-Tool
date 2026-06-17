import { describe, it, expect, afterEach } from 'vitest';
import { X32Client } from '@main/services/osc/X32Client';
import { X32Simulator } from '@main/services/simulator/X32Simulator';

// Loopback port distinct from the real X32 port (10023) to avoid clashes.
const PORT = 10123;

describe('X32Client ↔ X32Simulator (full OSC path)', () => {
  let sim: X32Simulator | undefined;
  let client: X32Client | undefined;

  afterEach(() => {
    client?.disconnect(true);
    sim?.stop();
    client = undefined;
    sim = undefined;
  });

  it('connects, reports identity, and reads 32 seeded names', async () => {
    sim = new X32Simulator(PORT);
    await sim.start();
    client = new X32Client();

    const status = await client.connect('127.0.0.1', PORT, true);
    expect(status.state).toBe('connected');
    expect(status.model).toBe('X32SIM');

    const { strips, unresolved } = await client.readBank('ch', ['name']);
    expect(strips).toHaveLength(32);
    expect(unresolved).toHaveLength(0);
    expect(strips[0].name).toBe('Kick In');
    expect(strips[17].name).toBe('Lead Vox');
  });

  it('truncates names to 12 characters on push, exactly like the desk', async () => {
    sim = new X32Simulator(PORT);
    await sim.start();
    client = new X32Client();
    await client.connect('127.0.0.1', PORT, true);

    const res = client.pushStrip({ bankId: 'ch', index: 5, name: 'ThisIsWayTooLong' });
    expect(res.ok).toBe(true);
    expect(res.truncated).toBe(true);

    // Allow the paced write queue + simulator to process the SET.
    await new Promise((r) => setTimeout(r, 120));

    const { strip } = await client.readStrip('ch', 5, ['name']);
    expect(strip.name).toBe('ThisIsWayToo');
  });

  it('round-trips color and icon writes', async () => {
    sim = new X32Simulator(PORT);
    await sim.start();
    client = new X32Client();
    await client.connect('127.0.0.1', PORT, true);

    client.pushStrip({ bankId: 'ch', index: 9, color: 4, icon: 22 });
    await new Promise((r) => setTimeout(r, 120));

    const { strip } = await client.readStrip('ch', 9, ['color', 'icon']);
    expect(strip.color).toBe(4);
    expect(strip.icon).toBe(22);
  });
});

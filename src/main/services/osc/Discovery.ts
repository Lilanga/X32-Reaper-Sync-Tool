/**
 * X32/M32 network discovery: broadcast an `/xinfo` probe on UDP 10023 and collect
 * replies. Each console answers to the sender's port with `/xinfo [ip, name,
 * model, firmware]`, so we key results by the responder's source IP (the address
 * to actually connect to).
 */

import dgram from 'node:dgram';
import { networkInterfaces } from 'node:os';

import { encodeMessage, decodePacket } from './oscCodec';
import type { DiscoveredConsole } from '@shared/ipc/contract';

/** Global broadcast plus each interface's directed subnet broadcast. */
function broadcastTargets(): string[] {
  const targets = new Set<string>(['255.255.255.255']);
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] ?? []) {
      if (ni.family !== 'IPv4' || ni.internal) continue;
      const ip = ni.address.split('.').map(Number);
      const mask = ni.netmask.split('.').map(Number);
      if (ip.length === 4 && mask.length === 4 && [...ip, ...mask].every((n) => !Number.isNaN(n))) {
        targets.add(ip.map((octet, i) => (octet & mask[i]) | (~mask[i] & 0xff)).join('.'));
      }
    }
  }
  return [...targets];
}

export function discoverX32(port = 10023, timeoutMs = 2000): Promise<DiscoveredConsole[]> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const found = new Map<string, DiscoveredConsole>();

    socket.on('message', (buf, rinfo) => {
      try {
        for (const msg of decodePacket(buf)) {
          if (msg.address !== '/xinfo') continue;
          const vals = msg.args.map((a) => (a.value instanceof Buffer ? '' : String(a.value)));
          found.set(rinfo.address, {
            ip: rinfo.address,
            name: vals[1] ?? '',
            model: vals[2] ?? '',
            firmware: vals[3] ?? '',
          });
        }
      } catch {
        /* ignore malformed datagrams */
      }
    });
    socket.on('error', () => {
      /* ignore — we resolve whatever we have on timeout */
    });

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true);
      } catch {
        /* some environments disallow broadcast; directed sends may still work */
      }
      const probe = encodeMessage('/xinfo', []);
      for (const target of broadcastTargets()) {
        socket.send(probe, port, target, () => {
          /* ignore per-target send errors */
        });
      }
    });

    setTimeout(() => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      resolve([...found.values()]);
    }, timeoutMs);
  });
}

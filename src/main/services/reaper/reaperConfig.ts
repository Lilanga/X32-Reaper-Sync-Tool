/**
 * Reads REAPER's saved Control/OSC/web device configuration. This lets the app
 * use the same ports and interface REAPER is already configured with instead of
 * relying on hard-coded loopback defaults.
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface ReaperOscSurfaceConfig {
  name: string;
  localListenPort: number;
  deviceHost: string;
  devicePort: number;
  pattern: string;
  raw: string;
}

export function reaperIniPath(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'REAPER', 'reaper.ini');
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'REAPER', 'reaper.ini');
  }
  return join(homedir(), '.config', 'REAPER', 'reaper.ini');
}

function tokenizeCsurfValue(value: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && /\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
}

export function parseReaperOscSurfaceLine(line: string): ReaperOscSurfaceConfig | null {
  const trimmed = line.trim();
  const eq = trimmed.indexOf('=');
  if (eq === -1 || !/^csurf_\d+$/.test(trimmed.slice(0, eq))) return null;

  const tokens = tokenizeCsurfValue(trimmed.slice(eq + 1));
  // OSC "Name" <mode> <local listen port> "<device IP>" <device port> <packet> <flags> "Pattern"
  if (tokens[0] !== 'OSC' || tokens.length < 9) return null;

  const localListenPort = Number(tokens[3]);
  const devicePort = Number(tokens[5]);
  if (!Number.isInteger(localListenPort) || !Number.isInteger(devicePort)) return null;
  if (localListenPort <= 0 || devicePort <= 0) return null;

  return {
    name: tokens[1],
    localListenPort,
    deviceHost: tokens[4],
    devicePort,
    pattern: tokens[8],
    raw: trimmed,
  };
}

function scoreSurface(surface: ReaperOscSurfaceConfig): number {
  const haystack = `${surface.name} ${surface.pattern}`.toLowerCase();
  if (haystack.includes('x32synctool')) return 3;
  if (haystack.includes('x32-sync-tool')) return 3;
  if (haystack.includes('x32')) return 2;
  return 1;
}

export function chooseReaperOscSurface(
  surfaces: ReaperOscSurfaceConfig[],
): ReaperOscSurfaceConfig | null {
  if (surfaces.length === 0) return null;
  return [...surfaces].sort((a, b) => scoreSurface(b) - scoreSurface(a))[0];
}

export async function detectReaperOscConfig(
  iniPath = reaperIniPath(),
): Promise<ReaperOscSurfaceConfig | null> {
  try {
    const ini = await readFile(iniPath, 'utf8');
    const surfaces = ini
      .split(/\r?\n/)
      .map(parseReaperOscSurfaceLine)
      .filter((s): s is ReaperOscSurfaceConfig => Boolean(s));
    return chooseReaperOscSurface(surfaces);
  } catch {
    return null;
  }
}

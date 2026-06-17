/**
 * Resolves REAPER's per-user OSC config folder and installs the shipped pattern
 * file into it, cross-platform.
 */

import { app } from 'electron';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { copyFile, mkdir } from 'node:fs/promises';

export const REAPER_PATTERN_FILE = 'X32SyncTool.ReaperOSC';

export function reaperOscDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'REAPER', 'OSC');
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'REAPER', 'OSC');
  }
  return join(homedir(), '.config', 'REAPER', 'OSC');
}

/** Path to a bundled resource, in dev and packaged builds. */
function resourcePath(...rel: string[]): string {
  const base = app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(app.getAppPath(), 'resources');
  return join(base, ...rel);
}

export async function installReaperPattern(): Promise<{
  ok: boolean;
  path: string;
  error?: string;
}> {
  try {
    const dir = reaperOscDir();
    await mkdir(dir, { recursive: true });
    const dest = join(dir, REAPER_PATTERN_FILE);
    await copyFile(resourcePath('reaper', REAPER_PATTERN_FILE), dest);
    return { ok: true, path: dest };
  } catch (err) {
    return { ok: false, path: '', error: (err as Error).message };
  }
}

/**
 * Dependency-free persistence of app Settings (+ window bounds) to a JSON file in
 * the OS userData dir. Read-modify-write keeps settings and window bounds in one
 * file without clobbering each other. Defaults fill any missing/invalid fields.
 */

import { app } from 'electron';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

import type { Settings } from '@shared/ipc/contract';

export function defaultSettings(): Settings {
  return {
    lastConsoleIp: '',
    consolePort: 10023,
    reaperListenPort: 9000,
    reaperHost: '127.0.0.1',
    reaperPort: 8000,
    simulatorEnabled: true,
    simulatorPort: 10023,
    theme: 'dark',
  };
}

export interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

const settingsSchema = z
  .object({
    lastConsoleIp: z.string(),
    consolePort: z.number().int().positive(),
    reaperListenPort: z.number().int().positive(),
    reaperHost: z.string(),
    reaperPort: z.number().int().positive(),
    simulatorEnabled: z.boolean(),
    simulatorPort: z.number().int().positive(),
    theme: z.enum(['dark', 'light', 'system']),
  })
  .partial();

const boundsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  x: z.number().int().optional(),
  y: z.number().int().optional(),
});

export class SettingsStore {
  private readonly file = join(app.getPath('userData'), 'settings.json');

  private read(): Record<string, unknown> {
    try {
      return JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private write(obj: Record<string, unknown>): void {
    try {
      writeFileSync(this.file, JSON.stringify(obj, null, 2));
    } catch {
      /* best-effort; never crash on a settings write */
    }
  }

  loadSettings(): Settings {
    const parsed = settingsSchema.safeParse(this.read().settings ?? {});
    return { ...defaultSettings(), ...(parsed.success ? parsed.data : {}) };
  }

  saveSettings(settings: Settings): void {
    const obj = this.read();
    obj.settings = settings;
    this.write(obj);
  }

  loadWindowBounds(): WindowBounds | undefined {
    const parsed = boundsSchema.safeParse(this.read().windowBounds);
    return parsed.success ? parsed.data : undefined;
  }

  saveWindowBounds(bounds: WindowBounds): void {
    const obj = this.read();
    obj.windowBounds = bounds;
    this.write(obj);
  }
}

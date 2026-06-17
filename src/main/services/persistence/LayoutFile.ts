/**
 * Save / load a channel layout (strip values per bank) to a user-chosen JSON
 * file via native dialogs. Loaded files are validated with zod before use.
 */

import { dialog } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { z } from 'zod';

import type { LayoutData } from '@shared/model/layout';

const stripSchema = z.object({
  bankId: z.string(),
  index: z.number().int(),
  name: z.string(),
  color: z.number().int(),
  icon: z.number().int(),
});

const layoutSchema = z.object({
  version: z.number(),
  app: z.string().optional(),
  savedAt: z.string().optional(),
  banks: z.record(z.string(), z.array(stripSchema)),
});

export interface LayoutSaveResult {
  ok: boolean;
  path?: string;
  canceled?: boolean;
  error?: string;
}

export interface LayoutLoadResult {
  ok: boolean;
  layout?: LayoutData;
  file?: string;
  canceled?: boolean;
  error?: string;
}

export async function saveLayoutFile(layout: LayoutData): Promise<LayoutSaveResult> {
  const res = await dialog.showSaveDialog({
    title: 'Save channel layout',
    defaultPath: 'channels.x32layout.json',
    filters: [{ name: 'X32 Layout', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  try {
    await writeFile(res.filePath, JSON.stringify(layout, null, 2));
    return { ok: true, path: basename(res.filePath) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function loadLayoutFile(): Promise<LayoutLoadResult> {
  const res = await dialog.showOpenDialog({
    title: 'Load channel layout',
    properties: ['openFile'],
    filters: [{ name: 'X32 Layout', extensions: ['json'] }],
  });
  if (res.canceled || res.filePaths.length === 0) return { ok: false, canceled: true };
  try {
    const text = await readFile(res.filePaths[0], 'utf8');
    const parsed = layoutSchema.parse(JSON.parse(text));
    return { ok: true, layout: parsed as unknown as LayoutData, file: basename(res.filePaths[0]) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

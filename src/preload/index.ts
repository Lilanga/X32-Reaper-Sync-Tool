/**
 * Secure bridge: exposes a tiny, generic `window.api` (invoke + event
 * subscription). All typing lives in the renderer's `api/client.ts`, which casts
 * these pass-throughs against the shared IpcContract — so no shared runtime code
 * needs to load in the sandboxed preload.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const api = {
  invoke: (channel: string, payload?: unknown): Promise<unknown> =>
    ipcRenderer.invoke(channel, payload),

  on: (channel: string, listener: (payload: unknown) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: unknown): void => listener(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type PreloadApi = typeof api;

/**
 * High-level operations shared by components. Each call talks to the main
 * process over the typed IPC client and updates the relevant store + toasts.
 */

import { invoke } from './client';
import { useChannelStore } from '@renderer/store/useChannelStore';
import { useConnectionStore } from '@renderer/store/useConnectionStore';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { useReaperStore } from '@renderer/store/useReaperStore';
import { toast } from '@renderer/store/useToastStore';
import { BANKS } from '@shared/x32/banks';
import { sanitizeName } from '@shared/validation/name';

export async function connectConsole(): Promise<void> {
  const { settings } = useSettingsStore.getState();
  useConnectionStore
    .getState()
    .setStatus({ state: 'connecting', simulator: settings.simulatorEnabled });
  const status = await invoke('console:connect', { ip: settings.lastConsoleIp });
  useConnectionStore.getState().setStatus(status);
  if (status.state === 'error') {
    toast(status.message ?? 'Connection failed', 'error');
  } else if (status.state === 'connected') {
    toast(
      status.simulator ? 'Connected to simulator' : `Connected to ${status.ip ?? 'console'}`,
      'success',
    );
  }
}

export async function disconnectConsole(): Promise<void> {
  const status = await invoke('console:disconnect');
  useConnectionStore.getState().setStatus(status);
}

export async function setSimulator(enabled: boolean): Promise<void> {
  await invoke('sim:setEnabled', { enabled });
  await invoke('settings:set', { simulatorEnabled: enabled });
  useSettingsStore.getState().patch({ simulatorEnabled: enabled });
  await disconnectConsole();
}

export async function pullFromConsole(): Promise<void> {
  const { bankId } = useChannelStore.getState();
  const res = await invoke('console:readBank', { bankId, fields: ['name'] });
  useChannelStore.getState().setStrips(res.strips, 'console', ['name'], res.unresolved);
  const read = res.strips.length - res.unresolved.length;
  toast(
    `Pulled ${read} name${read === 1 ? '' : 's'} from console` +
      (res.unresolved.length ? ` · ${res.unresolved.length} unread` : ''),
    res.unresolved.length ? 'warning' : 'success',
  );
}

export async function pushAll(): Promise<void> {
  const { bankId, strips } = useChannelStore.getState();
  const res = await invoke('console:pushBank', { bankId, strips, fields: ['name'] });
  if (!res.ok) {
    toast('Push failed — not connected', 'error');
    return;
  }
  useChannelStore.getState().markAllClean();
  const truncated = res.perStrip.filter((p) => p.truncated).length;
  toast(
    `Pushed ${res.perStrip.length} names` +
      (truncated ? ` · ${truncated} truncated to 12 chars` : ''),
    truncated ? 'warning' : 'success',
  );
}

export async function pushStrip(index: number): Promise<void> {
  const { bankId, strips } = useChannelStore.getState();
  const strip = strips[index - 1];
  if (!strip) return;
  const res = await invoke('console:pushStrip', { bankId, index, name: strip.name });
  if (!res.ok) {
    toast('Push failed — not connected', 'error');
    return;
  }
  useChannelStore.getState().markClean(index);
  toast(
    res.truncated ? `Ch ${index} pushed · truncated to 12 chars` : `Ch ${index} pushed`,
    res.truncated ? 'warning' : 'success',
  );
}

// ---- Reaper -------------------------------------------------------------

export async function reaperConnect(): Promise<void> {
  const status = await invoke('reaper:connect', {});
  useReaperStore.getState().setStatus(status);
  if (status.state === 'listening') {
    toast(`Listening for Reaper on UDP ${status.listenPort}`, 'success');
  } else if (status.state === 'error') {
    toast(status.message ?? 'Could not start Reaper listener', 'error');
  }
}

export async function reaperDisconnect(): Promise<void> {
  const status = await invoke('reaper:disconnect');
  useReaperStore.getState().setStatus(status);
}

export async function reaperRefresh(): Promise<void> {
  const res = await invoke('reaper:refresh');
  if (!res.ok) {
    toast('Start the Reaper listener first', 'error');
    return;
  }
  toast('Asked Reaper to resend track names…');
  // If nothing arrives shortly, surface guidance that pinpoints the likely cause.
  window.setTimeout(() => {
    const { tracks, monitor } = useReaperStore.getState();
    if (tracks.length > 0) return;
    if (monitor.packetsReceived === 0) {
      toast(
        'No OSC from Reaper. Most likely Reaper’s Device IP and Local IP are different interfaces — make them match (both 127.0.0.1, or both your LAN IP). Then rename a track to test.',
        'warning',
      );
    } else {
      toast(
        'Receiving OSC but no track names — tick “Allow binding messages to REAPER actions” and select the X32SyncTool pattern in Reaper.',
        'warning',
      );
    }
  }, 1800);
}

export async function installReaperPattern(): Promise<void> {
  const res = await invoke('reaper:installPattern');
  if (res.ok) toast(`Installed pattern file → ${res.path}`, 'success');
  else toast(`Install failed: ${res.error ?? 'unknown error'}`, 'error');
}

/** Apply received Reaper track names onto channels 1:1 (track N → channel N). */
export function applyReaperToGrid(): void {
  const { tracks } = useReaperStore.getState();
  const max = BANKS.ch.count;
  const entries = tracks
    .filter((t) => t.index >= 1 && t.index <= max && t.name.trim() !== '')
    .map((t) => ({ index: t.index, name: sanitizeName(t.name).name }));
  if (entries.length === 0) {
    toast('No Reaper track names yet — click Refresh first', 'warning');
    return;
  }
  useChannelStore.getState().applyReaperNames(entries);
  toast(`Applied ${entries.length} Reaper name${entries.length === 1 ? '' : 's'} to channels`, 'success');
}

export async function reaperSelfTest(): Promise<void> {
  const r = await invoke('reaper:selfTest');
  useReaperStore.getState().setSelfTest(r);
  if (!r.loopback) {
    toast('Self-test: app isn’t receiving even on loopback. Click “Start listening” first.', 'error');
    return;
  }
  const port = useReaperStore.getState().status.listenPort;
  const blocked = r.targets.filter((t) => !t.received);
  if (blocked.length === 0) {
    toast(
      'Self-test: app reachable on loopback and every interface. See Diagnostics for the list — set Reaper’s Device IP to one shown OK.',
      'success',
    );
  } else {
    toast(
      `Self-test: ${blocked.map((t) => t.ip).join(', ')} BLOCKED (likely firewall). If your Reaper Device IP is one of these, allow UDP ${port} through Windows Firewall. See Diagnostics for the full list.`,
      'warning',
    );
  }
}

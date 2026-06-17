/**
 * High-level operations shared by components. Each call talks to the main
 * process over the typed IPC client and updates the relevant store + toasts.
 */

import { invoke } from './client';
import { useChannelStore, hasDirtyField } from '@renderer/store/useChannelStore';
import { useConnectionStore } from '@renderer/store/useConnectionStore';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { useReaperStore } from '@renderer/store/useReaperStore';
import { toast } from '@renderer/store/useToastStore';
import { BANKS, type StripField, type BankId } from '@shared/x32/banks';
import { sanitizeName } from '@shared/validation/name';
import type { ReaperTrack, DiscoveredConsole } from '@shared/ipc/contract';
import { LAYOUT_VERSION, type LayoutData } from '@shared/model/layout';

const ALL_FIELDS: StripField[] = ['name', 'color', 'icon'];

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

/** Broadcast-scan the local network for X32/M32 consoles. */
export async function scanForConsoles(): Promise<DiscoveredConsole[]> {
  const res = await invoke('console:discover', {});
  return res.found;
}

/** Switch to real hardware at `ip` (simulator off) and connect. */
export async function connectToConsole(ip: string): Promise<void> {
  await invoke('sim:setEnabled', { enabled: false });
  await invoke('settings:set', { simulatorEnabled: false, lastConsoleIp: ip });
  useSettingsStore.getState().patch({ simulatorEnabled: false, lastConsoleIp: ip });
  await connectConsole();
}

export async function pullFromConsole(): Promise<void> {
  const bankId = useChannelStore.getState().activeBank;
  const res = await invoke('console:readBank', { bankId, fields: ALL_FIELDS });
  useChannelStore.getState().setStrips(bankId, res.strips, 'console', ALL_FIELDS, res.unresolved);
  toast(
    `Pulled ${BANKS[bankId].label} — name, color & icon for ${res.strips.length} strip${res.strips.length === 1 ? '' : 's'}` +
      (res.unresolved.length ? ` · ${res.unresolved.length} value(s) unread` : ''),
    res.unresolved.length ? 'warning' : 'success',
  );
}

export async function pushAll(): Promise<void> {
  const { banks } = useChannelStore.getState();
  const jobs = (Object.keys(banks) as BankId[]).flatMap((bankId) =>
    banks[bankId].strips
      .filter((strip) => hasDirtyField(banks[bankId].dirty[strip.index]))
      .map((strip) => ({ bankId, strip, flags: banks[bankId].dirty[strip.index] ?? {} })),
  );
  if (jobs.length === 0) {
    toast('No unsaved edits to push', 'default');
    return;
  }
  const results = await Promise.all(
    jobs.map((j) =>
      invoke('console:pushStrip', {
        bankId: j.bankId,
        index: j.strip.index,
        name: j.flags.name ? j.strip.name : undefined,
        color: j.flags.color ? j.strip.color : undefined,
        icon: j.flags.icon ? j.strip.icon : undefined,
      }).then((res) => ({ job: j, res })),
    ),
  );
  if (results.some((r) => !r.res.ok)) {
    toast('Push failed — not connected', 'error');
    return;
  }
  for (const r of results) {
    useChannelStore.getState().markStripClean(r.job.bankId, r.job.strip.index);
  }
  const truncated = results.filter((r) => r.res.truncated).length;
  toast(
    `Pushed ${results.length} strip${results.length === 1 ? '' : 's'}` +
      (truncated ? ` · ${truncated} name(s) truncated to 12` : ''),
    truncated ? 'warning' : 'success',
  );
}

export async function pushStrip(bankId: BankId, index: number): Promise<void> {
  const bank = useChannelStore.getState().banks[bankId];
  const strip = bank.strips[index - 1];
  if (!strip) return;
  const flags = bank.dirty[index];
  if (!hasDirtyField(flags)) {
    toast(`${BANKS[bankId].short} ${index}: no unsaved changes`, 'default');
    return;
  }
  const f = flags ?? {};
  const res = await invoke('console:pushStrip', {
    bankId,
    index,
    name: f.name ? strip.name : undefined,
    color: f.color ? strip.color : undefined,
    icon: f.icon ? strip.icon : undefined,
  });
  if (!res.ok) {
    toast('Push failed — not connected', 'error');
    return;
  }
  useChannelStore.getState().markStripClean(bankId, index);
  toast(
    res.truncated
      ? `${BANKS[bankId].short} ${index} pushed · name truncated`
      : `${BANKS[bankId].short} ${index} pushed`,
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

/** Map Reaper tracks onto channels 1:1 (track N → channel N) and write the grid. Returns count applied. */
function applyTracksToGrid(tracks: ReaperTrack[]): number {
  const max = BANKS.ch.count;
  const entries = tracks
    .filter((t) => t.index >= 1 && t.index <= max && t.name.trim() !== '')
    .map((t) => ({ index: t.index, name: sanitizeName(t.name).name }));
  if (entries.length) {
    // Reaper tracks map to the input-channel bank.
    useChannelStore.getState().applyReaperNames('ch', entries);
    useChannelStore.getState().setActiveBank('ch');
  }
  return entries.length;
}

export async function importReaperProject(): Promise<void> {
  const res = await invoke('reaper:importProject');
  if (!res.ok) {
    if (res.error) toast(`Project import failed: ${res.error}`, 'error');
    return; // silent on cancel
  }
  // Populate both the Reaper panel list and the editable grid (grid uses the
  // response tracks directly, so it never races the reaper:tracks event).
  useReaperStore.getState().setTracks(res.tracks);
  const applied = applyTracksToGrid(res.tracks);
  if (applied === 0) {
    toast(`Imported ${res.tracks.length} tracks, but none had names to apply`, 'warning');
  } else {
    toast(
      `Imported ${res.tracks.length} track${res.tracks.length === 1 ? '' : 's'} → applied ${applied} name${applied === 1 ? '' : 's'} to channels`,
      'success',
    );
  }
}

/** Apply the panel's current Reaper track names onto the grid (used by the live-OSC flow). */
export function applyReaperToGrid(): void {
  const applied = applyTracksToGrid(useReaperStore.getState().tracks);
  if (applied === 0) {
    toast('No Reaper track names yet — import a project or click Refresh first', 'warning');
    return;
  }
  toast(`Applied ${applied} Reaper name${applied === 1 ? '' : 's'} to channels`, 'success');
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

// ---- Layout persistence + settings --------------------------------------

function buildLayout(): LayoutData {
  const { banks } = useChannelStore.getState();
  const out: LayoutData['banks'] = {};
  for (const id of Object.keys(banks) as BankId[]) {
    out[id] = banks[id].strips.map((strip) => ({ ...strip }));
  }
  return {
    version: LAYOUT_VERSION,
    app: 'tritone-x32-sync',
    savedAt: new Date().toISOString(),
    banks: out,
  };
}

export async function saveLayout(): Promise<void> {
  const res = await invoke('layout:save', { layout: buildLayout() });
  if (res.canceled) return;
  if (res.ok) toast(`Saved layout → ${res.path}`, 'success');
  else toast(`Save failed: ${res.error ?? 'unknown error'}`, 'error');
}

export async function loadLayout(): Promise<void> {
  const res = await invoke('layout:load');
  if (res.canceled) return;
  if (!res.ok || !res.layout) {
    toast(`Load failed: ${res.error ?? 'unknown error'}`, 'error');
    return;
  }
  useChannelStore.getState().loadLayout(res.layout.banks);
  const count = Object.values(res.layout.banks).reduce((n, arr) => n + (arr?.length ?? 0), 0);
  toast(`Loaded ${count} strips from ${res.file} — review and Push`, 'success');
}

/** Persist the console IP so it's remembered next launch (called on IP-field blur). */
export async function rememberConsoleIp(ip: string): Promise<void> {
  await invoke('settings:set', { lastConsoleIp: ip });
}

/**
 * High-level operations shared by components. Each call talks to the main
 * process over the typed IPC client and updates the relevant store + toasts.
 */

import { invoke } from './client';
import { useChannelStore } from '@renderer/store/useChannelStore';
import { useConnectionStore } from '@renderer/store/useConnectionStore';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { toast } from '@renderer/store/useToastStore';

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

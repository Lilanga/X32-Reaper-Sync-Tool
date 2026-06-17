import { useEffect, useRef } from 'react';

import { invoke, onEvent } from '@renderer/api/client';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import { useConnectionStore } from '@renderer/store/useConnectionStore';
import { useChannelStore } from '@renderer/store/useChannelStore';
import { useReaperStore } from '@renderer/store/useReaperStore';

/** Hydrate initial state from main and subscribe to push events. Runs once. */
export function useBootstrap(): void {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const state = await invoke('app:getState');
        useSettingsStore.getState().setSettings(state.settings);
        useConnectionStore.getState().setStatus(state.connection);
        useReaperStore.getState().setStatus(state.reaper);
      } catch {
        /* main not ready — events will catch us up */
      }
    })();

    const offStatus = onEvent('console:status', (status) => {
      useConnectionStore.getState().setStatus(status);
    });
    const offChanged = onEvent('console:changed', (change) => {
      useChannelStore
        .getState()
        .applyConsoleChange(change.bankId, change.index, change.field, change.value);
    });
    const offReaperStatus = onEvent('reaper:status', (status) => {
      useReaperStore.getState().setStatus(status);
    });
    const offReaperTracks = onEvent('reaper:tracks', ({ tracks }) => {
      useReaperStore.getState().setTracks(tracks);
    });
    const offReaperMonitor = onEvent('reaper:monitor', (monitor) => {
      useReaperStore.getState().setMonitor(monitor);
    });

    return () => {
      offStatus();
      offChanged();
      offReaperStatus();
      offReaperTracks();
      offReaperMonitor();
    };
  }, []);
}

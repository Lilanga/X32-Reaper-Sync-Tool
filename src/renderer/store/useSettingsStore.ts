import { create } from 'zustand';
import type { Settings } from '@shared/ipc/contract';

const DEFAULTS: Settings = {
  lastConsoleIp: '',
  consolePort: 10023,
  reaperListenPort: 9000,
  reaperHost: '127.0.0.1',
  reaperPort: 8000,
  simulatorEnabled: true,
  simulatorPort: 10023,
  theme: 'dark',
};

interface SettingsState {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  patch: (patch: Partial<Settings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULTS,
  setSettings: (settings) => set({ settings }),
  patch: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
}));

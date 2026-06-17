import { create } from 'zustand';
import type { ConnectionStatus } from '@shared/ipc/contract';

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: { state: 'disconnected', simulator: true },
  setStatus: (status) => set({ status }),
}));

export function isLive(status: ConnectionStatus): boolean {
  return status.state === 'connected' || status.state === 'degraded';
}

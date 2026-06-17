import { create } from 'zustand';
import type { ReaperStatus, ReaperTrack, ReaperMonitor } from '@shared/ipc/contract';

interface ReaperStoreState {
  status: ReaperStatus;
  tracks: ReaperTrack[];
  monitor: ReaperMonitor;
  setStatus: (status: ReaperStatus) => void;
  setTracks: (tracks: ReaperTrack[]) => void;
  setMonitor: (monitor: ReaperMonitor) => void;
}

export const useReaperStore = create<ReaperStoreState>((set) => ({
  status: {
    state: 'stopped',
    listenPort: 9000,
    reaperHost: '127.0.0.1',
    reaperPort: 8000,
    trackCount: 0,
    lastFeedbackAt: null,
    packetsReceived: 0,
    lastInboundAt: null,
  },
  tracks: [],
  monitor: { packetsReceived: 0, recent: [] },
  setStatus: (status) => set({ status }),
  setTracks: (tracks) => set({ tracks }),
  setMonitor: (monitor) => set({ monitor }),
}));

export function isReaperLive(status: ReaperStatus): boolean {
  return status.state === 'listening';
}

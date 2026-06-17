import { create } from 'zustand';
import type { ReaperStatus, ReaperTrack } from '@shared/ipc/contract';

interface ReaperStoreState {
  status: ReaperStatus;
  tracks: ReaperTrack[];
  setStatus: (status: ReaperStatus) => void;
  setTracks: (tracks: ReaperTrack[]) => void;
}

export const useReaperStore = create<ReaperStoreState>((set) => ({
  status: {
    state: 'stopped',
    listenPort: 9000,
    reaperHost: '127.0.0.1',
    reaperPort: 8000,
    trackCount: 0,
    lastFeedbackAt: null,
  },
  tracks: [],
  setStatus: (status) => set({ status }),
  setTracks: (tracks) => set({ tracks }),
}));

export function isReaperLive(status: ReaperStatus): boolean {
  return status.state === 'listening';
}

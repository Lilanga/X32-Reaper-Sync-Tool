import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { BANKS, type BankId, type StripField } from '@shared/x32/banks';
import {
  emptyStrip,
  type ChannelStripValue,
  type StripSource,
} from '@shared/model/channelStrip';

const ACTIVE_BANK: BankId = 'ch';

function initialStrips(bankId: BankId): ChannelStripValue[] {
  const bank = BANKS[bankId];
  return Array.from({ length: bank.count }, (_, i) => emptyStrip(bankId, i + 1));
}

interface ChannelState {
  bankId: BankId;
  strips: ChannelStripValue[];
  dirty: Record<number, boolean>;
  source: Record<number, StripSource>;
  unresolved: string[];
  lastReadAt: number | null;

  setStrips: (
    incoming: ChannelStripValue[],
    source: StripSource,
    fields: StripField[],
    unresolved?: string[],
  ) => void;
  setName: (index: number, name: string) => void;
  setColor: (index: number, color: number) => void;
  setIcon: (index: number, icon: number) => void;
  applyConsoleChange: (index: number, field: StripField, value: string | number) => void;
  markClean: (index: number) => void;
  markAllClean: () => void;
  reset: () => void;
  dirtyCount: () => number;
}

export const useChannelStore = create<ChannelState>()(
  immer((set, get) => ({
    bankId: ACTIVE_BANK,
    strips: initialStrips(ACTIVE_BANK),
    dirty: {},
    source: {},
    unresolved: [],
    lastReadAt: null,

    setStrips: (incoming, source, fields, unresolved = []) =>
      set((s) => {
        for (const inc of incoming) {
          const cur = s.strips[inc.index - 1];
          if (!cur || cur.index !== inc.index) continue;
          if (fields.includes('name')) cur.name = inc.name;
          if (fields.includes('color')) cur.color = inc.color;
          if (fields.includes('icon')) cur.icon = inc.icon;
          s.dirty[inc.index] = false;
          s.source[inc.index] = source;
        }
        s.unresolved = unresolved;
        s.lastReadAt = Date.now();
      }),

    setName: (index, name) =>
      set((s) => {
        const cur = s.strips[index - 1];
        if (!cur) return;
        cur.name = name;
        s.dirty[index] = true;
        s.source[index] = 'user';
      }),

    setColor: (index, color) =>
      set((s) => {
        const cur = s.strips[index - 1];
        if (!cur) return;
        cur.color = color;
        s.dirty[index] = true;
        s.source[index] = 'user';
      }),

    setIcon: (index, icon) =>
      set((s) => {
        const cur = s.strips[index - 1];
        if (!cur) return;
        cur.icon = icon;
        s.dirty[index] = true;
        s.source[index] = 'user';
      }),

    applyConsoleChange: (index, field, value) =>
      set((s) => {
        if (s.dirty[index]) return; // never clobber a pending user edit
        const cur = s.strips[index - 1];
        if (!cur) return;
        if (field === 'name') cur.name = String(value);
        else if (field === 'color') cur.color = Number(value);
        else cur.icon = Number(value);
        s.source[index] = 'console';
      }),

    markClean: (index) =>
      set((s) => {
        s.dirty[index] = false;
      }),

    markAllClean: () =>
      set((s) => {
        s.dirty = {};
      }),

    reset: () =>
      set((s) => {
        s.strips = initialStrips(s.bankId);
        s.dirty = {};
        s.source = {};
        s.unresolved = [];
        s.lastReadAt = null;
      }),

    dirtyCount: () => {
      const { dirty } = get();
      return Object.keys(dirty).filter((k) => dirty[Number(k)]).length;
    },
  })),
);

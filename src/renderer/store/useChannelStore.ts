import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { BANKS, type BankId, type StripField } from '@shared/x32/banks';
import {
  emptyStrip,
  type ChannelStripValue,
  type StripSource,
} from '@shared/model/channelStrip';

const ACTIVE_BANK: BankId = 'ch';

/** Which fields of a strip have unsaved edits (so Push only sends what changed). */
export type FieldFlags = { name?: boolean; color?: boolean; icon?: boolean };

export function hasDirtyField(flags: FieldFlags | undefined): boolean {
  return !!flags && (!!flags.name || !!flags.color || !!flags.icon);
}

function initialStrips(bankId: BankId): ChannelStripValue[] {
  const bank = BANKS[bankId];
  return Array.from({ length: bank.count }, (_, i) => emptyStrip(bankId, i + 1));
}

interface ChannelState {
  bankId: BankId;
  strips: ChannelStripValue[];
  dirty: Record<number, FieldFlags>;
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
  applyReaperNames: (entries: Array<{ index: number; name: string }>) => void;
  applyConsoleChange: (index: number, field: StripField, value: string | number) => void;
  markStripClean: (index: number) => void;
  markAllClean: () => void;
  reset: () => void;
}

export const useChannelStore = create<ChannelState>()(
  immer((set) => ({
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
          // Values now mirror the console → the pulled fields are no longer dirty.
          const flags = s.dirty[inc.index];
          if (flags) for (const f of fields) delete flags[f];
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
        if (!s.dirty[index]) s.dirty[index] = {};
        s.dirty[index].name = true;
        s.source[index] = 'user';
      }),

    setColor: (index, color) =>
      set((s) => {
        const cur = s.strips[index - 1];
        if (!cur) return;
        cur.color = color;
        if (!s.dirty[index]) s.dirty[index] = {};
        s.dirty[index].color = true;
        s.source[index] = 'user';
      }),

    setIcon: (index, icon) =>
      set((s) => {
        const cur = s.strips[index - 1];
        if (!cur) return;
        cur.icon = icon;
        if (!s.dirty[index]) s.dirty[index] = {};
        s.dirty[index].icon = true;
        s.source[index] = 'user';
      }),

    applyReaperNames: (entries) =>
      set((s) => {
        for (const entry of entries) {
          const cur = s.strips[entry.index - 1];
          if (!cur) continue;
          cur.name = entry.name;
          if (!s.dirty[entry.index]) s.dirty[entry.index] = {};
          s.dirty[entry.index].name = true;
          s.source[entry.index] = 'reaper';
        }
      }),

    applyConsoleChange: (index, field, value) =>
      set((s) => {
        const flags = s.dirty[index];
        if (flags && flags[field]) return; // never clobber a pending user edit
        const cur = s.strips[index - 1];
        if (!cur) return;
        if (field === 'name') cur.name = String(value);
        else if (field === 'color') cur.color = Number(value);
        else cur.icon = Number(value);
        s.source[index] = 'console';
      }),

    markStripClean: (index) =>
      set((s) => {
        delete s.dirty[index];
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
  })),
);

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { BANKS, BANK_ORDER, type BankId, type StripField } from '@shared/x32/banks';
import {
  emptyStrip,
  type ChannelStripValue,
  type StripSource,
} from '@shared/model/channelStrip';

/** Which fields of a strip have unsaved edits (so Push only sends what changed). */
export type FieldFlags = { name?: boolean; color?: boolean; icon?: boolean };

export function hasDirtyField(flags: FieldFlags | undefined): boolean {
  return !!flags && (!!flags.name || !!flags.color || !!flags.icon);
}

interface BankData {
  strips: ChannelStripValue[];
  dirty: Record<number, FieldFlags>;
  source: Record<number, StripSource>;
  unresolved: string[];
  lastReadAt: number | null;
}

function initBank(bankId: BankId): BankData {
  const bank = BANKS[bankId];
  return {
    strips: Array.from({ length: bank.count }, (_, i) => emptyStrip(bankId, i + 1)),
    dirty: {},
    source: {},
    unresolved: [],
    lastReadAt: null,
  };
}

function initBanks(): Record<BankId, BankData> {
  const out = {} as Record<BankId, BankData>;
  for (const id of BANK_ORDER) out[id] = initBank(id);
  return out;
}

interface ChannelState {
  activeBank: BankId;
  banks: Record<BankId, BankData>;

  setActiveBank: (bankId: BankId) => void;
  setStrips: (
    bankId: BankId,
    incoming: ChannelStripValue[],
    source: StripSource,
    fields: StripField[],
    unresolved?: string[],
  ) => void;
  setName: (bankId: BankId, index: number, name: string) => void;
  setColor: (bankId: BankId, index: number, color: number) => void;
  setIcon: (bankId: BankId, index: number, icon: number) => void;
  applyReaperNames: (bankId: BankId, entries: Array<{ index: number; name: string }>) => void;
  applyConsoleChange: (
    bankId: BankId,
    index: number,
    field: StripField,
    value: string | number,
  ) => void;
  loadLayout: (banks: Partial<Record<BankId, ChannelStripValue[]>>) => void;
  markStripClean: (bankId: BankId, index: number) => void;
  markAllClean: () => void;
  reset: () => void;
}

export const useChannelStore = create<ChannelState>()(
  immer((set) => ({
    activeBank: 'ch',
    banks: initBanks(),

    setActiveBank: (bankId) =>
      set((s) => {
        s.activeBank = bankId;
      }),

    setStrips: (bankId, incoming, source, fields, unresolved = []) =>
      set((s) => {
        const bank = s.banks[bankId];
        for (const inc of incoming) {
          const cur = bank.strips[inc.index - 1];
          if (!cur || cur.index !== inc.index) continue;
          if (fields.includes('name')) cur.name = inc.name;
          if (fields.includes('color')) cur.color = inc.color;
          if (fields.includes('icon')) cur.icon = inc.icon;
          const flags = bank.dirty[inc.index];
          if (flags) for (const f of fields) delete flags[f];
          bank.source[inc.index] = source;
        }
        bank.unresolved = unresolved;
        bank.lastReadAt = Date.now();
      }),

    setName: (bankId, index, name) =>
      set((s) => {
        const bank = s.banks[bankId];
        const cur = bank.strips[index - 1];
        if (!cur) return;
        cur.name = name;
        if (!bank.dirty[index]) bank.dirty[index] = {};
        bank.dirty[index].name = true;
        bank.source[index] = 'user';
      }),

    setColor: (bankId, index, color) =>
      set((s) => {
        const bank = s.banks[bankId];
        const cur = bank.strips[index - 1];
        if (!cur) return;
        cur.color = color;
        if (!bank.dirty[index]) bank.dirty[index] = {};
        bank.dirty[index].color = true;
        bank.source[index] = 'user';
      }),

    setIcon: (bankId, index, icon) =>
      set((s) => {
        const bank = s.banks[bankId];
        const cur = bank.strips[index - 1];
        if (!cur) return;
        cur.icon = icon;
        if (!bank.dirty[index]) bank.dirty[index] = {};
        bank.dirty[index].icon = true;
        bank.source[index] = 'user';
      }),

    applyReaperNames: (bankId, entries) =>
      set((s) => {
        const bank = s.banks[bankId];
        for (const entry of entries) {
          const cur = bank.strips[entry.index - 1];
          if (!cur) continue;
          cur.name = entry.name;
          if (!bank.dirty[entry.index]) bank.dirty[entry.index] = {};
          bank.dirty[entry.index].name = true;
          bank.source[entry.index] = 'reaper';
        }
      }),

    applyConsoleChange: (bankId, index, field, value) =>
      set((s) => {
        const bank = s.banks[bankId];
        const flags = bank.dirty[index];
        if (flags && flags[field]) return; // never clobber a pending user edit
        const cur = bank.strips[index - 1];
        if (!cur) return;
        if (field === 'name') cur.name = String(value);
        else if (field === 'color') cur.color = Number(value);
        else cur.icon = Number(value);
        bank.source[index] = 'console';
      }),

    loadLayout: (banksData) =>
      set((s) => {
        for (const id of Object.keys(banksData) as BankId[]) {
          const incoming = banksData[id];
          const bank = s.banks[id];
          if (!incoming || !bank) continue;
          const supportsIcon = BANKS[id].supportsIcon;
          for (const inc of incoming) {
            const cur = bank.strips[inc.index - 1];
            if (!cur) continue;
            cur.name = inc.name;
            cur.color = inc.color;
            if (supportsIcon) cur.icon = inc.icon;
            const flags: FieldFlags = { name: true, color: true };
            if (supportsIcon) flags.icon = true;
            bank.dirty[inc.index] = flags;
            bank.source[inc.index] = 'user';
          }
        }
      }),

    markStripClean: (bankId, index) =>
      set((s) => {
        delete s.banks[bankId].dirty[index];
      }),

    markAllClean: () =>
      set((s) => {
        for (const id of BANK_ORDER) s.banks[id].dirty = {};
      }),

    reset: () =>
      set((s) => {
        s.banks = initBanks();
        s.activeBank = 'ch';
      }),
  })),
);

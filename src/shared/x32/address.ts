/**
 * Pure OSC address builders and parsers for X32 channel-strip config nodes.
 * Used by main (to talk to the console / simulator) and indirectly by the
 * renderer. No I/O, fully unit-testable.
 */

import { BANKS, BANK_ORDER, type BankDescriptor, type BankId, type StripField } from './banks';

/** Format a strip index according to the bank's zero-pad rule. */
export function formatIndex(pad: 0 | 1 | 2, index: number): string {
  if (pad === 0) return '';
  if (pad === 1) return String(index);
  return index.toString().padStart(2, '0');
}

/** Build the `/.../config` base address for a strip (without the trailing field). */
export function stripBase(bank: BankDescriptor, index: number): string {
  return bank.base.replace('{i}', formatIndex(bank.pad, index));
}

function fieldAddr(bankId: BankId, index: number, field: StripField): string {
  return `${stripBase(BANKS[bankId], index)}/${field}`;
}

export function nameAddr(bankId: BankId, index: number): string {
  return fieldAddr(bankId, index, 'name');
}

export function colorAddr(bankId: BankId, index: number): string {
  return fieldAddr(bankId, index, 'color');
}

export function iconAddr(bankId: BankId, index: number): string {
  return fieldAddr(bankId, index, 'icon');
}

export function addrForField(bankId: BankId, index: number, field: StripField): string {
  return fieldAddr(bankId, index, field);
}

export interface ParsedAddr {
  bankId: BankId;
  index: number;
  field: StripField;
}

const FIELD_RE = /^(\/.*\/config)\/(name|color|icon)$/;

/**
 * Reverse a `/ch/01/config/name`-style address into a structured target.
 * Returns null for anything that is not a recognised strip-config field
 * (so inbound `/xremote` traffic and replies can be safely filtered).
 */
export function parseAddr(address: string): ParsedAddr | null {
  const m = FIELD_RE.exec(address);
  if (!m) return null;
  const base = m[1];
  const field = m[2] as StripField;

  for (const bankId of BANK_ORDER) {
    const bank = BANKS[bankId];
    if (bank.pad === 0) {
      if (base === bank.base) return { bankId, index: 1, field };
      continue;
    }
    const re = new RegExp('^' + bank.base.replace('{i}', '(\\d{1,2})') + '$');
    const mm = re.exec(base);
    if (mm) {
      const index = parseInt(mm[1], 10);
      if (index >= 1 && index <= bank.count) return { bankId, index, field };
    }
  }
  return null;
}

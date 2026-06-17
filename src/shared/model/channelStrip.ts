import type { BankId } from '../x32/banks';

/** The editable value of a single channel strip, mirrored between console and UI. */
export interface ChannelStripValue {
  bankId: BankId;
  index: number;
  name: string;
  color: number;
  icon: number;
}

/** Where a strip's current value originated — drives the source chip + conflict logic. */
export type StripSource = 'console' | 'reaper' | 'user' | 'unknown';

export function stripKey(bankId: BankId, index: number): string {
  return `${bankId}:${index}`;
}

export function emptyStrip(bankId: BankId, index: number): ChannelStripValue {
  return { bankId, index, name: '', color: 0, icon: 1 };
}

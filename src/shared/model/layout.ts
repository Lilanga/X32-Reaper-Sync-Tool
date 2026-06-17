import type { BankId } from '../x32/banks';
import type { ChannelStripValue } from './channelStrip';

export const LAYOUT_VERSION = 1;

/** A saved channel layout: strip values (name/color/icon) for one or more banks. */
export interface LayoutData {
  version: number;
  app?: string;
  savedAt?: string;
  banks: Partial<Record<BankId, ChannelStripValue[]>>;
}

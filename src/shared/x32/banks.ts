/**
 * The X32/M32 channel-bank descriptor table — the config-driven core of the app.
 * One table drives OSC address building, UI tabs, strip counts, and validation,
 * so adding a new bank later requires no transport changes.
 */

export type BankId =
  | 'ch'
  | 'auxin'
  | 'fxrtn'
  | 'bus'
  | 'mtx'
  | 'mainSt'
  | 'mainM'
  | 'dca';

export type StripField = 'name' | 'color' | 'icon';

export interface BankDescriptor {
  id: BankId;
  /** Full label for tabs/headers. */
  label: string;
  /** Short label for compact UI. */
  short: string;
  /** Number of strips in this bank. */
  count: number;
  /**
   * Index zero-pad width used when building OSC addresses:
   *  - 2 → "01".."32" (input channels, buses, …)
   *  - 1 → "1".."8"   (DCAs)
   *  - 0 → no index   (main stereo / mono — the base address is already terminal)
   */
  pad: 0 | 1 | 2;
  /** OSC config base; `{i}` is replaced with the formatted index (absent for pad:0 banks). */
  base: string;
  supportsColor: boolean;
  supportsIcon: boolean;
  nameMax: 12;
}

export const BANKS: Record<BankId, BankDescriptor> = {
  ch: {
    id: 'ch',
    label: 'Input Channels',
    short: 'Inputs',
    count: 32,
    pad: 2,
    base: '/ch/{i}/config',
    supportsColor: true,
    supportsIcon: true,
    nameMax: 12,
  },
  auxin: {
    id: 'auxin',
    label: 'Aux In',
    short: 'Aux',
    count: 8,
    pad: 2,
    base: '/auxin/{i}/config',
    supportsColor: true,
    supportsIcon: true,
    nameMax: 12,
  },
  fxrtn: {
    id: 'fxrtn',
    label: 'FX Returns',
    short: 'FX Ret',
    count: 8,
    pad: 2,
    base: '/fxrtn/{i}/config',
    supportsColor: true,
    supportsIcon: true,
    nameMax: 12,
  },
  bus: {
    id: 'bus',
    label: 'Mix Buses',
    short: 'Buses',
    count: 16,
    pad: 2,
    base: '/bus/{i}/config',
    supportsColor: true,
    supportsIcon: true,
    nameMax: 12,
  },
  mtx: {
    id: 'mtx',
    label: 'Matrices',
    short: 'Matrix',
    count: 6,
    pad: 2,
    base: '/mtx/{i}/config',
    supportsColor: true,
    supportsIcon: true,
    nameMax: 12,
  },
  mainSt: {
    id: 'mainSt',
    label: 'Main Stereo',
    short: 'Main St',
    count: 1,
    pad: 0,
    base: '/main/st/config',
    supportsColor: true,
    supportsIcon: true,
    nameMax: 12,
  },
  mainM: {
    id: 'mainM',
    label: 'Main Mono / Center',
    short: 'Main M',
    count: 1,
    pad: 0,
    base: '/main/m/config',
    supportsColor: true,
    supportsIcon: true,
    nameMax: 12,
  },
  dca: {
    id: 'dca',
    label: 'DCA Groups',
    short: 'DCA',
    count: 8,
    pad: 1,
    base: '/dca/{i}/config',
    supportsColor: true,
    supportsIcon: false, // DCAs have no icon parameter on the X32
    nameMax: 12,
  },
};

/** Canonical display order of banks. */
export const BANK_ORDER: BankId[] = [
  'ch',
  'auxin',
  'fxrtn',
  'bus',
  'mtx',
  'mainSt',
  'mainM',
  'dca',
];

export function getBank(bankId: BankId): BankDescriptor {
  return BANKS[bankId];
}

export function isBankId(value: string): value is BankId {
  return Object.prototype.hasOwnProperty.call(BANKS, value);
}

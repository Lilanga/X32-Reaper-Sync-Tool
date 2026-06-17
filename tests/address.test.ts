import { describe, it, expect } from 'vitest';
import { nameAddr, colorAddr, iconAddr, parseAddr } from '@shared/x32/address';

describe('x32 address builders', () => {
  it('zero-pads input channels to two digits', () => {
    expect(nameAddr('ch', 1)).toBe('/ch/01/config/name');
    expect(nameAddr('ch', 32)).toBe('/ch/32/config/name');
    expect(colorAddr('ch', 7)).toBe('/ch/07/config/color');
    expect(iconAddr('ch', 12)).toBe('/ch/12/config/icon');
  });

  it('uses a single digit for DCAs', () => {
    expect(nameAddr('dca', 3)).toBe('/dca/3/config/name');
  });

  it('omits the index for main outputs', () => {
    expect(nameAddr('mainSt', 1)).toBe('/main/st/config/name');
    expect(nameAddr('mainM', 1)).toBe('/main/m/config/name');
  });

  it('builds bus and matrix addresses', () => {
    expect(nameAddr('bus', 16)).toBe('/bus/16/config/name');
    expect(nameAddr('mtx', 6)).toBe('/mtx/06/config/name');
  });
});

describe('parseAddr', () => {
  it('round-trips channel, bus, dca and main addresses', () => {
    expect(parseAddr('/ch/01/config/name')).toEqual({ bankId: 'ch', index: 1, field: 'name' });
    expect(parseAddr('/ch/32/config/color')).toEqual({ bankId: 'ch', index: 32, field: 'color' });
    expect(parseAddr('/bus/16/config/icon')).toEqual({ bankId: 'bus', index: 16, field: 'icon' });
    expect(parseAddr('/dca/8/config/name')).toEqual({ bankId: 'dca', index: 8, field: 'name' });
    expect(parseAddr('/main/st/config/name')).toEqual({ bankId: 'mainSt', index: 1, field: 'name' });
    expect(parseAddr('/main/m/config/color')).toEqual({ bankId: 'mainM', index: 1, field: 'color' });
  });

  it('rejects out-of-range indices and junk', () => {
    expect(parseAddr('/ch/99/config/name')).toBeNull();
    expect(parseAddr('/xremote')).toBeNull();
    expect(parseAddr('/ch/01/config/gain')).toBeNull();
    expect(parseAddr('not an address')).toBeNull();
  });
});

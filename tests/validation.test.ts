import { describe, it, expect } from 'vitest';
import { sanitizeName, isValidName, NAME_MAX } from '@shared/validation/name';
import { clampColor, COLORS } from '@shared/x32/colors';
import { clampIcon } from '@shared/x32/icons';

describe('sanitizeName', () => {
  it('truncates to 12 characters and flags it', () => {
    const r = sanitizeName('ThisIsWayTooLong');
    expect(r.name).toBe('ThisIsWayToo');
    expect(r.name.length).toBe(NAME_MAX);
    expect(r.truncated).toBe(true);
  });

  it('strips non-printable / non-ASCII characters', () => {
    const r = sanitizeName('Vóx\t1');
    expect(r.name).toBe('Vx1');
    expect(r.stripped).toBe(true);
  });

  it('passes clean short names through unchanged', () => {
    const r = sanitizeName('Lead Vox');
    expect(r).toEqual({ name: 'Lead Vox', truncated: false, stripped: false });
  });

  it('isValidName respects the limit and charset', () => {
    expect(isValidName('Kick In')).toBe(true);
    expect(isValidName('WayTooLongName')).toBe(false);
    expect(isValidName('Vóx')).toBe(false);
  });
});

describe('color/icon clamps', () => {
  it('clamps color into 0..15', () => {
    expect(clampColor(-3)).toBe(0);
    expect(clampColor(99)).toBe(15);
    expect(clampColor(4)).toBe(4);
    expect(COLORS).toHaveLength(16);
  });

  it('clamps icon into 1..74', () => {
    expect(clampIcon(0)).toBe(1);
    expect(clampIcon(999)).toBe(74);
    expect(clampIcon(40)).toBe(40);
  });
});

/**
 * X32 scribble-strip color model. The console encodes color as an integer 0–15:
 *  0       = Off
 *  1–7     = RD, GN, YE, BL, MG, CY, WH (colored text on dark)
 *  8–15    = the same hues "inverted" (dark text on a colored background)
 */

export interface X32Color {
  value: number;
  code: string;
  label: string;
  /** Display hex for the swatch (approximation of the desk's palette). */
  hex: string;
  inverted: boolean;
}

interface BaseHue {
  code: string;
  label: string;
  hex: string;
}

const BASE_HUES: BaseHue[] = [
  { code: 'OFF', label: 'Off', hex: '#3a3f4b' },
  { code: 'RD', label: 'Red', hex: '#ff453a' },
  { code: 'GN', label: 'Green', hex: '#32d74b' },
  { code: 'YE', label: 'Yellow', hex: '#ffd60a' },
  { code: 'BL', label: 'Blue', hex: '#0a84ff' },
  { code: 'MG', label: 'Magenta', hex: '#ff375f' },
  { code: 'CY', label: 'Cyan', hex: '#64d2ff' },
  { code: 'WH', label: 'White', hex: '#f5f5f7' },
];

export const COLOR_MIN = 0;
export const COLOR_MAX = 15;
export const COLOR_COUNT = 16;

export const COLORS: X32Color[] = [
  ...BASE_HUES.map((h, i) => ({ value: i, code: h.code, label: h.label, hex: h.hex, inverted: false })),
  ...BASE_HUES.map((h, i) => ({
    value: i + 8,
    code: `${h.code}i`,
    label: `${h.label} (inv)`,
    hex: h.hex,
    inverted: true,
  })),
];

export function clampColor(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const v = Math.round(value);
  if (v < COLOR_MIN) return COLOR_MIN;
  if (v > COLOR_MAX) return COLOR_MAX;
  return v;
}

export function getColor(value: number): X32Color {
  return COLORS[clampColor(value)];
}

/** Choose a readable foreground for a given X32 color chip. */
export function colorForeground(value: number): string {
  const c = getColor(value);
  if (c.value === 0) return '#c7ccd6';
  // Inverted swatches render as a filled hue → use dark text; normal → light text.
  return c.inverted ? '#0b0d12' : '#0b0d12';
}

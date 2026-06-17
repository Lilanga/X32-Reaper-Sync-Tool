/**
 * X32 channel icon model. The console supports 74 built-in icons addressed by
 * integer 1–74. Human-friendly labels are refined in M3; for now we expose the
 * range, a clamp helper, and a generic label so the transport layer is complete.
 */

export const ICON_MIN = 1;
export const ICON_MAX = 74;
export const ICON_COUNT = ICON_MAX;

export function clampIcon(value: number): number {
  if (!Number.isFinite(value)) return ICON_MIN;
  const v = Math.round(value);
  if (v < ICON_MIN) return ICON_MIN;
  if (v > ICON_MAX) return ICON_MAX;
  return v;
}

export interface X32Icon {
  id: number;
  label: string;
}

export function iconLabel(id: number): string {
  return `Icon ${clampIcon(id)}`;
}

export const ICONS: X32Icon[] = Array.from({ length: ICON_COUNT }, (_, i) => ({
  id: i + 1,
  label: iconLabel(i + 1),
}));

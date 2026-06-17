/**
 * Channel-name validation shared by the renderer (live input) and the main
 * process (defensive truncation before sending). The X32 scribble strip stores
 * at most 12 characters and renders printable ASCII.
 */

export const NAME_MAX = 12;

// Printable ASCII range (space .. tilde). Anything else is stripped.
const NON_PRINTABLE = /[^\x20-\x7E]/g;

export interface SanitizeResult {
  name: string;
  /** True if characters beyond the 12-char limit were dropped. */
  truncated: boolean;
  /** True if non-ASCII / control characters were removed. */
  stripped: boolean;
}

export function sanitizeName(input: string): SanitizeResult {
  const cleaned = (input ?? '').replace(NON_PRINTABLE, '');
  const stripped = cleaned.length !== (input ?? '').length;
  const truncated = cleaned.length > NAME_MAX;
  return {
    name: cleaned.slice(0, NAME_MAX),
    truncated,
    stripped,
  };
}

export function isValidName(value: string): boolean {
  return value.length <= NAME_MAX && !NON_PRINTABLE.test(value);
}

/** Characters remaining before the limit (can be negative before sanitizing). */
export function remaining(value: string): number {
  return NAME_MAX - value.length;
}

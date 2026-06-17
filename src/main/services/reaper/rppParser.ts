import type { ReaperTrack } from '@shared/ipc/contract';

/**
 * Decode a REAPER config-string value. REAPER wraps a value in whichever of
 * `"` `'` `` ` `` does not occur in the string — so there is never an escaped
 * quote — or leaves a single token unquoted. (REAPER does not use backslash
 * escapes in .RPP, so a name like `Bass` is written unquoted and `Vox "Lead"`
 * is written single-quoted.)
 */
export function parseRppValue(token: string): string {
  const s = token.trim();
  if (s.length === 0) return '';
  const q = s[0];
  if ((q === '"' || q === "'" || q === '`') && s.length >= 2 && s[s.length - 1] === q) {
    return s.slice(1, -1);
  }
  return s.split(/\s+/)[0];
}

/**
 * Extract top-level track names from a REAPER .RPP project, in order. The name
 * is the first `NAME` attribute directly inside each `<TRACK …>` block; `NAME`
 * lines in nested blocks (items, FX chains) are ignored via depth tracking.
 * Unnamed tracks are kept with an empty name so indexes stay aligned 1:1.
 */
export function parseRppTrackNames(rpp: string): ReaperTrack[] {
  const tracks: ReaperTrack[] = [];
  let inTrack = false;
  let trackDepth = 0;
  let currentName = '';

  const finishTrack = (): void => {
    tracks.push({ index: tracks.length + 1, name: currentName });
    inTrack = false;
    trackDepth = 0;
    currentName = '';
  };

  for (const line of rpp.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!inTrack) {
      if (trimmed.startsWith('<TRACK')) {
        inTrack = true;
        trackDepth = 1;
        currentName = '';
      }
      continue;
    }

    if (trackDepth === 1 && trimmed.startsWith('NAME ') && currentName === '') {
      currentName = parseRppValue(trimmed.slice('NAME '.length));
      continue;
    }

    if (trimmed.startsWith('<')) {
      trackDepth++;
      continue;
    }

    if (trimmed === '>') {
      trackDepth--;
      if (trackDepth === 0) finishTrack();
    }
  }

  return tracks;
}

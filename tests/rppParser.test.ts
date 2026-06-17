import { describe, expect, it } from 'vitest';

import { parseRppTrackNames, parseRppValue } from '@main/services/reaper/rppParser';

describe('parseRppValue (REAPER config-string quoting)', () => {
  it('handles double-quoted, single-quoted, backtick and unquoted values', () => {
    expect(parseRppValue('"Kick In"')).toBe('Kick In');
    expect(parseRppValue('Bass')).toBe('Bass'); // single token, unquoted
    expect(parseRppValue(`'Vox "Lead"'`)).toBe('Vox "Lead"'); // alt-quote, no escaping
    expect(parseRppValue('`O\'Brien`')).toBe("O'Brien");
    expect(parseRppValue('""')).toBe('');
  });
});

describe('parseRppTrackNames', () => {
  it('extracts top-level track names in order, ignoring nested NAMEs', () => {
    const tracks = parseRppTrackNames(`
<REAPER_PROJECT 0.1 "7.0/win64" 1700000000
  <TRACK {111}
    NAME "Kick In"
    <ITEM
      NAME "kick-media.wav"
    >
  >
  <TRACK {222}
    NAME Bass
  >
  <TRACK {333}
    NAME 'Vox "Lead"'
  >
>
`);

    expect(tracks).toEqual([
      { index: 1, name: 'Kick In' },
      { index: 2, name: 'Bass' },
      { index: 3, name: 'Vox "Lead"' },
    ]);
  });

  it('keeps unnamed tracks with an empty name so indexes stay aligned', () => {
    const tracks = parseRppTrackNames(`
<TRACK
>
<TRACK
  NAME "Bass"
>
`);

    expect(tracks).toEqual([
      { index: 1, name: '' },
      { index: 2, name: 'Bass' },
    ]);
  });
});

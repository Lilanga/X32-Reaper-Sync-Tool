/* eslint-disable react-refresh/only-export-components -- glyph library: data + render component live together */
/**
 * Custom themed line-icon set for the X32's 74 channel icons. Each glyph is our
 * own minimal recreation (stroke = currentColor, so it picks up the theme / brand
 * accent) of what the corresponding console icon depicts — no console bitmaps are
 * used. The console stores the *number*; these are the on-screen representation.
 *
 * Labels follow the user-reviewed X32 icon list (1–74).
 */

import type { ReactNode } from 'react';

interface IconDef {
  label: string;
  svg: ReactNode;
}

// Drum cylinder helper expressed inline per-icon to keep each glyph self-contained.
const ICONS: Record<number, IconDef> = {
  1: { label: 'Blank', svg: <circle cx="12" cy="12" r="7" strokeDasharray="2.5 2.5" /> },
  2: {
    label: 'Kick (back)',
    svg: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  },
  3: {
    label: 'Kick (front)',
    svg: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </>
    ),
  },
  4: {
    label: 'Snare (top)',
    svg: (
      <>
        <ellipse cx="12" cy="8" rx="7" ry="2.2" />
        <path d="M5 8v6M19 8v6" />
        <path d="M5 14a7 2.2 0 0 0 14 0" />
        <path d="M6 7.4v1.4M18 7.4v1.4" />
      </>
    ),
  },
  5: {
    label: 'Snare (bottom)',
    svg: (
      <>
        <ellipse cx="12" cy="8" rx="7" ry="2.2" />
        <path d="M5 8v6M19 8v6" />
        <path d="M5 14a7 2.2 0 0 0 14 0" />
        <path d="M6.5 15.5l1.3 1.2 1.3-1.2 1.3 1.2 1.3-1.2 1.3 1.2" />
      </>
    ),
  },
  6: {
    label: 'Tom (high)',
    svg: (
      <>
        <ellipse cx="12" cy="9" rx="5" ry="1.8" />
        <path d="M7 9v4M17 9v4" />
        <path d="M7 13a5 1.8 0 0 0 10 0" />
      </>
    ),
  },
  7: {
    label: 'Tom (mid)',
    svg: (
      <>
        <ellipse cx="12" cy="9" rx="6" ry="2" />
        <path d="M6 9v5.5M18 9v5.5" />
        <path d="M6 14.5a6 2 0 0 0 12 0" />
      </>
    ),
  },
  8: {
    label: 'Floor tom',
    svg: (
      <>
        <ellipse cx="12" cy="8" rx="7" ry="2.2" />
        <path d="M5 8v7M19 8v7" />
        <path d="M5 15a7 2.2 0 0 0 14 0" />
        <path d="M6 16v3M18 16v3" />
      </>
    ),
  },
  9: {
    label: 'Hi-hat',
    svg: (
      <>
        <ellipse cx="12" cy="9" rx="7" ry="1.5" />
        <ellipse cx="12" cy="11.6" rx="7" ry="1.5" />
        <path d="M12 11.6V20M9 20h6" />
      </>
    ),
  },
  10: {
    label: 'Crash',
    svg: (
      <>
        <ellipse cx="12" cy="8" rx="8" ry="1.5" transform="rotate(-10 12 8)" />
        <path d="M12 8.5V20M9 20h6" />
      </>
    ),
  },
  11: {
    label: 'Drums (sticks)',
    svg: (
      <>
        <path d="M5 19 16 7" />
        <path d="M9 19 19 8" />
        <circle cx="16" cy="7" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="19" cy="8" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
  },
  12: {
    label: 'Bell',
    svg: (
      <>
        <path d="M12 4C9 4 8 7 8 11c0 3-2 4-2 6h12c0-2-2-3-2-6 0-4-1-7-4-7Z" />
        <path d="M12 4V2.5" />
        <path d="M10.5 17a1.5 1.2 0 0 0 3 0" />
      </>
    ),
  },
  13: {
    label: 'Conga',
    svg: (
      <>
        <ellipse cx="12" cy="6" rx="4" ry="1.6" />
        <path d="M8 6 9.4 18M16 6 14.6 18" />
        <path d="M9.4 18a2.6 1.1 0 0 0 5.2 0" />
      </>
    ),
  },
  14: {
    label: 'Congas (pair)',
    svg: (
      <>
        <ellipse cx="8" cy="7" rx="3" ry="1.3" />
        <path d="M5 7 6.4 17M11 7 9.6 17" />
        <path d="M6.4 17a1.6 .8 0 0 0 3.2 0" />
        <ellipse cx="16" cy="8" rx="3" ry="1.3" />
        <path d="M13 8 14.4 18M19 8 17.6 18" />
        <path d="M14.4 18a1.6 .8 0 0 0 3.2 0" />
      </>
    ),
  },
  15: {
    label: 'Tambourine',
    svg: (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="4.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="19.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  16: {
    label: 'Xylophone',
    svg: (
      <>
        <path d="M4 8h16M5 11.5h13M6 15h10M7 18.5h7" />
        <path d="M16 5 13 9.5" />
        <circle cx="16" cy="5" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
  },
  17: {
    label: 'Electric bass',
    svg: (
      <>
        <ellipse cx="8" cy="15" rx="4.5" ry="4" />
        <path d="M10.5 13 20 4M19.5 3.5 21.5 5" />
        <path d="M6.5 15.5h3.4" />
      </>
    ),
  },
  18: {
    label: 'Acoustic bass 1',
    svg: (
      <>
        <ellipse cx="8" cy="15" rx="5" ry="4.5" />
        <circle cx="8" cy="15" r="1.8" />
        <path d="M11.5 12 20 4M19.5 3.5 21.5 5" />
      </>
    ),
  },
  19: {
    label: 'Acoustic bass 2',
    svg: (
      <>
        <ellipse cx="8" cy="15" rx="5" ry="4.5" />
        <circle cx="8" cy="15" r="1.8" />
        <path d="M5 17.5h6" />
        <path d="M11.5 12 20 4" />
      </>
    ),
  },
  20: {
    label: 'Electric guitar 1',
    svg: (
      <>
        <ellipse cx="8" cy="15" rx="4" ry="3.6" />
        <path d="M10.8 13 20 4M19.5 3.5 21.5 5" />
        <path d="M6.4 14.6h3.2M6.4 16.2h3.2" />
      </>
    ),
  },
  21: {
    label: 'Electric guitar 2',
    svg: (
      <>
        <path d="M11 12.5a4 3.6 0 1 0 -2 5.6" />
        <ellipse cx="8" cy="15" rx="4" ry="3.6" />
        <path d="M10.8 13 20 4" />
        <path d="M6.4 15.4h3.2" />
      </>
    ),
  },
  22: {
    label: 'Electric guitar 3',
    svg: (
      <>
        <ellipse cx="8" cy="15" rx="4" ry="3.6" />
        <path d="M10.8 13 20 4" />
        <path d="M6.4 13.8h3.2M6.4 15.4h3.2M6.4 17h3.2" />
      </>
    ),
  },
  23: {
    label: 'Acoustic guitar',
    svg: (
      <>
        <ellipse cx="8" cy="15" rx="4.5" ry="4" />
        <circle cx="8" cy="15" r="1.6" />
        <path d="M11 12.5 20 4M19.5 3.5 21.5 5" />
      </>
    ),
  },
  24: {
    label: 'Amp 1',
    svg: (
      <>
        <rect x="6" y="5" width="12" height="14" rx="1" />
        <circle cx="12" cy="13" r="3" />
        <path d="M8 8h8" />
      </>
    ),
  },
  25: {
    label: 'Amp 2',
    svg: (
      <>
        <rect x="6" y="5" width="12" height="14" rx="1" />
        <circle cx="9" cy="13" r="2.3" />
        <circle cx="15" cy="13" r="2.3" />
        <path d="M8 8h8" />
      </>
    ),
  },
  26: {
    label: 'Amp stack',
    svg: (
      <>
        <rect x="6" y="3" width="12" height="5" rx="1" />
        <rect x="6" y="9" width="12" height="12" rx="1" />
        <circle cx="12" cy="15" r="3.4" />
        <path d="M9 5.5h6" />
      </>
    ),
  },
  27: {
    label: 'Acoustic piano',
    svg: (
      <>
        <rect x="4" y="10" width="16" height="7" rx="1" />
        <path d="M8 10v7M12 10v7M16 10v7" />
        <rect x="6.3" y="10" width="1.4" height="3.4" fill="currentColor" stroke="none" />
        <rect x="10.3" y="10" width="1.4" height="3.4" fill="currentColor" stroke="none" />
        <rect x="14.3" y="10" width="1.4" height="3.4" fill="currentColor" stroke="none" />
        <path d="M4 9.5Q12 5.5 20 9.5" />
      </>
    ),
  },
  28: {
    label: 'Organ',
    svg: (
      <>
        <rect x="5" y="13" width="14" height="5" rx="1" />
        <path d="M9.5 13v5M14 13v5" />
        <path d="M6 12V5M8 12V7M10 12V4M12 12V6M14 12V5M16 12V7M18 12V6" />
      </>
    ),
  },
  29: {
    label: 'Electric keys 1',
    svg: (
      <>
        <rect x="3" y="8" width="18" height="9" rx="2" />
        <rect x="5" y="12" width="14" height="3.5" rx="0.5" />
        <path d="M9 12v3.5M14 12v3.5" />
      </>
    ),
  },
  30: {
    label: 'Electric keys 2',
    svg: (
      <>
        <rect x="6" y="10" width="14" height="7" rx="1" />
        <path d="M10 10v7M15 10v7" />
        <circle cx="3.6" cy="12.5" r="1.8" />
        <path d="M3.6 10.7v3.6" />
      </>
    ),
  },
  31: {
    label: 'Synth 1 (sine)',
    svg: (
      <>
        <rect x="4" y="13" width="16" height="5" rx="1" />
        <path d="M9 13v5M15 13v5" />
        <path d="M4 8q2-3 4 0t4 0 4 0" />
      </>
    ),
  },
  32: {
    label: 'Synth 2 (square)',
    svg: (
      <>
        <rect x="4" y="13" width="16" height="5" rx="1" />
        <path d="M9 13v5M15 13v5" />
        <path d="M4 9V6h4v3h4V6h4v3" />
      </>
    ),
  },
  33: {
    label: 'Synth 3 (knobs)',
    svg: (
      <>
        <rect x="4" y="13" width="16" height="5" rx="1" />
        <path d="M9 13v5M15 13v5" />
        <circle cx="7" cy="7" r="1.6" />
        <circle cx="12" cy="7" r="1.6" />
        <circle cx="17" cy="7" r="1.6" />
      </>
    ),
  },
  34: {
    label: 'Synth 4 (saw)',
    svg: (
      <>
        <rect x="4" y="13" width="16" height="5" rx="1" />
        <path d="M9 13v5M15 13v5" />
        <path d="M4 9 8 5v4l4-4v4l4-4v4" />
      </>
    ),
  },
  35: {
    label: 'Trumpet',
    svg: (
      <>
        <path d="M4 11h12" />
        <path d="M16 8 21 6v9l-5-2Z" />
        <path d="M7 11V8M9.5 11V8M12 11V8" />
        <circle cx="3.5" cy="11" r="1" />
      </>
    ),
  },
  36: {
    label: 'Trombone',
    svg: (
      <>
        <path d="M3 12h13" />
        <path d="M16 9 21 7v6l-5-2Z" />
        <path d="M5 12v4h9" />
      </>
    ),
  },
  37: {
    label: 'Saxophone',
    svg: (
      <>
        <path d="M11 4v8a4 4 0 0 0 4 4h1q3 0 2-3" />
        <circle cx="11" cy="3.5" r="1" />
        <circle cx="11" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="11" cy="9" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="11.6" cy="11.4" r="0.6" fill="currentColor" stroke="none" />
      </>
    ),
  },
  38: {
    label: 'Clarinet',
    svg: (
      <>
        <path d="M12 3v12" />
        <path d="M10 15h4l1.5 5h-7Z" />
        <circle cx="12" cy="6" r="0.7" fill="currentColor" stroke="none" />
        <circle cx="12" cy="9" r="0.7" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />
      </>
    ),
  },
  39: {
    label: 'Violin',
    svg: (
      <>
        <path d="M12 11c-4 0-5 3-5 5s2 4 5 4 5-2 5-4-1-5-5-5Z" />
        <path d="M12 11V4" />
        <circle cx="12" cy="3.4" r="1.4" />
        <path d="M10 15v3M14 15v3" />
      </>
    ),
  },
  40: {
    label: 'Cello',
    svg: (
      <>
        <path d="M12 9c-5 0-6 4-6 7s3 5 6 5 6-2 6-5-1-7-6-7Z" />
        <path d="M12 9V3" />
        <circle cx="12" cy="2.5" r="1.3" />
        <path d="M9.5 14v3M14.5 14v3" />
        <path d="M12 21v2.5" />
      </>
    ),
  },
  41: {
    label: 'Male singer',
    svg: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M4.5 19a4.5 5 0 0 1 9 0" />
        <path d="M13.5 13 17 9.5" />
        <circle cx="17.6" cy="8.8" r="1.7" />
      </>
    ),
  },
  42: {
    label: 'Female singer',
    svg: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M6.2 7v5M11.8 7v5" />
        <path d="M4.5 19a4.5 5 0 0 1 9 0" />
        <path d="M13.5 13 17 9.5" />
        <circle cx="17.6" cy="8.8" r="1.7" />
      </>
    ),
  },
  43: {
    label: 'Choir',
    svg: (
      <>
        <circle cx="7" cy="9" r="2.3" />
        <circle cx="12" cy="7" r="2.5" />
        <circle cx="17" cy="9" r="2.3" />
        <path d="M3.5 20a3.5 3.5 0 0 1 7 0M8.5 18.5a3.5 3.5 0 0 1 7 0M13.5 20a3.5 3.5 0 0 1 7 0" />
      </>
    ),
  },
  44: {
    label: 'Hand sign',
    svg: (
      <>
        <path d="M8 13V6.5a1 1 0 0 1 2 0V11M10 11V5a1 1 0 0 1 2 0v6M12 11V5.5a1 1 0 0 1 2 0V11M14 11V7a1 1 0 0 1 2 0v6c0 3-2 6-5 6h-1c-2 0-3-1-4-3l-2.5-3a1.2 1.2 0 0 1 1.8-1.6L8 13" />
      </>
    ),
  },
  45: {
    label: 'Talkback A',
    svg: (
      <>
        <path d="M5 5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="M8 10h8" />
      </>
    ),
  },
  46: {
    label: 'Talkback B',
    svg: (
      <>
        <path d="M5 5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="M8 8.5h8M8 11.5h5" />
      </>
    ),
  },
  47: {
    label: 'Mic 1 (dynamic)',
    svg: (
      <>
        <rect x="8.5" y="3" width="7" height="9" rx="3.5" />
        <path d="M8.5 6h7M8.5 8.5h7" />
        <path d="M12 12v6M9 18h6" />
      </>
    ),
  },
  48: {
    label: 'Condenser mic (L)',
    svg: (
      <>
        <rect x="8" y="4" width="8" height="7" rx="1.5" transform="rotate(-18 12 7.5)" />
        <path d="M12 11.5V18M9 18h6" />
      </>
    ),
  },
  49: {
    label: 'Condenser mic (R)',
    svg: (
      <>
        <rect x="8" y="4" width="8" height="7" rx="1.5" transform="rotate(18 12 7.5)" />
        <path d="M12 11.5V18M9 18h6" />
      </>
    ),
  },
  50: {
    label: 'Mic 2',
    svg: (
      <>
        <rect x="9" y="3" width="6" height="8" rx="3" />
        <path d="M12 11v8M8 21l4-2 4 2" />
      </>
    ),
  },
  51: {
    label: 'Wireless mic',
    svg: (
      <>
        <rect x="8.5" y="3" width="7" height="8" rx="3.5" />
        <path d="M8.5 6h7" />
        <path d="M12 11v6" />
        <path d="M9.5 19q2.5 2 5 0" />
      </>
    ),
  },
  52: {
    label: 'Table mic',
    svg: (
      <>
        <path d="M6 20h12" />
        <rect x="9" y="18.5" width="6" height="1.5" rx="0.5" fill="currentColor" stroke="none" />
        <path d="M12 18.5C12 13 16 13 16 8" />
        <circle cx="16" cy="6.5" r="2" />
      </>
    ),
  },
  53: {
    label: 'In-ear monitor',
    svg: (
      <>
        <circle cx="9.5" cy="12" r="4" />
        <path d="M12.5 14 16 17" />
        <ellipse cx="17" cy="17.5" rx="2" ry="1.5" />
        <path d="M9.5 8V4" />
      </>
    ),
  },
  54: {
    label: 'XLR connector',
    svg: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
  },
  55: {
    label: 'TRS jack',
    svg: (
      <>
        <path d="M3 12h4" />
        <rect x="7" y="10.5" width="7" height="3" rx="0.5" />
        <path d="M14 11.5h4" />
        <path d="M9.5 10.5v3M11.5 10.5v3" />
      </>
    ),
  },
  56: {
    label: 'TRS (L)',
    svg: (
      <>
        <rect x="7" y="10.5" width="7" height="3" rx="0.5" />
        <path d="M3 12h4M14 11.5h4M9.5 10.5v3M11.5 10.5v3" />
        <path d="M9 6 6 8l3 2" />
      </>
    ),
  },
  57: {
    label: 'TRS (R)',
    svg: (
      <>
        <rect x="7" y="10.5" width="7" height="3" rx="0.5" />
        <path d="M3 12h4M14 11.5h4M9.5 10.5v3M11.5 10.5v3" />
        <path d="M12 6 15 8l-3 2" />
      </>
    ),
  },
  58: {
    label: 'RCA (L)',
    svg: (
      <>
        <circle cx="13" cy="12" r="4" />
        <path d="M13 12h6M3 12h6" />
        <path d="M9 6 6 8l3 2" />
      </>
    ),
  },
  59: {
    label: 'RCA (R)',
    svg: (
      <>
        <circle cx="11" cy="12" r="4" />
        <path d="M11 12h8M3 12h4" />
        <path d="M14 6 17 8l-3 2" />
      </>
    ),
  },
  60: {
    label: 'Tape recorder',
    svg: (
      <>
        <circle cx="7" cy="12" r="4" />
        <circle cx="17" cy="12" r="4" />
        <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="12" r="1" fill="currentColor" stroke="none" />
        <path d="M7 8h10M7 16h10" />
      </>
    ),
  },
  61: {
    label: 'FX',
    svg: (
      <>
        <path d="M12 4 13 10 19 12 13 14 12 20 11 14 5 12 11 10Z" />
        <path d="M18.5 4.5 19.2 6.6 21.3 7.3 19.2 8 18.5 10.1 17.8 8 15.7 7.3 17.8 6.6Z" />
      </>
    ),
  },
  62: {
    label: 'PC',
    svg: (
      <>
        <rect x="4" y="5" width="16" height="11" rx="1" />
        <path d="M10 16v3M8 19h8" />
        <path d="M7 8.5h7" />
      </>
    ),
  },
  63: {
    label: 'Wedge monitor',
    svg: (
      <>
        <path d="M3 17 21 13v5H3Z" />
        <circle cx="14" cy="16" r="2.3" />
      </>
    ),
  },
  64: {
    label: 'Speaker (R)',
    svg: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="1" />
        <circle cx="12" cy="15" r="3.5" />
        <circle cx="12" cy="6.5" r="1.5" />
        <path d="M14.5 4.5 16.5 6l-2 1.5" />
      </>
    ),
  },
  65: {
    label: 'Speaker (L)',
    svg: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="1" />
        <circle cx="12" cy="15" r="3.5" />
        <circle cx="12" cy="6.5" r="1.5" />
        <path d="M9.5 4.5 7.5 6l2 1.5" />
      </>
    ),
  },
  66: {
    label: 'Line array',
    svg: (
      <>
        <path d="M6 5h12l-1 3H7Z" />
        <path d="M7 9h10l-0.8 3H7.8Z" />
        <path d="M7.8 13h8.4l-0.7 3H8.5Z" />
        <path d="M10 4v1M14 4v1" />
      </>
    ),
  },
  67: {
    label: 'Speaker on stand',
    svg: (
      <>
        <rect x="8" y="3" width="8" height="9" rx="1" />
        <circle cx="12" cy="8" r="2.3" />
        <path d="M12 12v6M8 21l4-3 4 3M12 18v3" />
      </>
    ),
  },
  68: {
    label: 'Rack',
    svg: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <path d="M5 8h14M5 13h14M5 18h14" />
        <circle cx="7" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="17" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
      </>
    ),
  },
  69: {
    label: 'Controls (knobs)',
    svg: (
      <>
        <circle cx="7" cy="12" r="3" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="17" cy="12" r="3" />
        <path d="M7 12V9.5M12 12l1.8-1.5M17 12V9.5" />
      </>
    ),
  },
  70: {
    label: 'Faders',
    svg: (
      <>
        <path d="M7 4v16M12 4v16M17 4v16" />
        <rect x="5.5" y="8" width="3" height="2.4" rx="0.5" fill="currentColor" stroke="none" />
        <rect x="10.5" y="13" width="3" height="2.4" rx="0.5" fill="currentColor" stroke="none" />
        <rect x="15.5" y="6" width="3" height="2.4" rx="0.5" fill="currentColor" stroke="none" />
      </>
    ),
  },
  71: {
    label: 'Routing — main',
    svg: (
      <>
        <path d="M3 12h12" />
        <path d="M11 8 15 12l-4 4" />
        <rect x="17" y="8" width="3" height="8" rx="0.5" />
      </>
    ),
  },
  72: {
    label: 'Routing — bus',
    svg: (
      <>
        <path d="M3 12h5M8 12V7h7M8 12v5h7" />
        <path d="M13 5 15 7l-2 2M13 15 15 17l-2 2" />
      </>
    ),
  },
  73: {
    label: 'Routing — dispatch',
    svg: (
      <>
        <path d="M3 12h4M7 12 17 5M7 12h10M7 12 17 19" />
        <path d="M15 4 17 5l-1 2M15 12h2M15 18l2-1-1-2" />
      </>
    ),
  },
  74: {
    label: 'Smiley',
    svg: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
        <path d="M8 14a4 3 0 0 0 8 0" />
      </>
    ),
  },
};

export function iconLabel(id: number): string {
  return ICONS[id]?.label ?? `Icon ${id}`;
}

export function IconGlyph({ id, className }: { id: number; className?: string }) {
  const content = ICONS[id]?.svg ?? <circle cx="12" cy="12" r="7" />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}

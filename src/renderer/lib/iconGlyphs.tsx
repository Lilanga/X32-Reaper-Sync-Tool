/**
 * Maps each X32 channel-icon index (1–74) to a human label and a themed line
 * glyph (lucide). The console stores the *number*; these glyphs are our own
 * on-brand recreations of what each icon represents (lucide has no orchestral
 * instruments, so several share a glyph — the label + number disambiguate).
 * Labels follow the documented X32 icon set (1–64); 65–74 fall back to generic.
 */

import {
  Minus,
  Drum,
  Disc,
  Disc3,
  Bell,
  Guitar,
  Speaker,
  Music,
  Music2,
  Music3,
  Music4,
  Mic,
  Mic2,
  Users,
  Hand,
  Megaphone,
  Headphones,
  Cable,
  Sparkles,
  Laptop,
  type LucideIcon,
} from 'lucide-react';

export interface IconDef {
  label: string;
  Glyph: LucideIcon;
}

const ICONS: Record<number, IconDef> = {
  1: { label: 'Blank', Glyph: Minus },
  2: { label: 'Kick (back)', Glyph: Drum },
  3: { label: 'Kick (front)', Glyph: Drum },
  4: { label: 'Snare (top)', Glyph: Drum },
  5: { label: 'Snare (bottom)', Glyph: Drum },
  6: { label: 'Tom (high)', Glyph: Drum },
  7: { label: 'Tom (mid)', Glyph: Drum },
  8: { label: 'Tom', Glyph: Drum },
  9: { label: 'Hi-hat', Glyph: Disc3 },
  10: { label: 'Crash', Glyph: Disc3 },
  11: { label: 'Drums', Glyph: Drum },
  12: { label: 'Bell', Glyph: Bell },
  13: { label: 'Congas 1', Glyph: Drum },
  14: { label: 'Congas 2', Glyph: Drum },
  15: { label: 'Tambourine', Glyph: Disc3 },
  16: { label: 'Xylophone', Glyph: Music2 },
  17: { label: 'Electric bass', Glyph: Guitar },
  18: { label: 'Acoustic bass 1', Glyph: Guitar },
  19: { label: 'Acoustic bass 2', Glyph: Guitar },
  20: { label: 'Electric guitar 1', Glyph: Guitar },
  21: { label: 'Electric guitar 2', Glyph: Guitar },
  22: { label: 'Electric guitar 3', Glyph: Guitar },
  23: { label: 'Acoustic guitar', Glyph: Guitar },
  24: { label: 'Amp 1', Glyph: Speaker },
  25: { label: 'Amp 2', Glyph: Speaker },
  26: { label: 'Amp 3', Glyph: Speaker },
  27: { label: 'Acoustic piano', Glyph: Music3 },
  28: { label: 'Organ', Glyph: Music3 },
  29: { label: 'Electric keys 1', Glyph: Music3 },
  30: { label: 'Electric keys 2', Glyph: Music3 },
  31: { label: 'Synth 1', Glyph: Music4 },
  32: { label: 'Synth 2', Glyph: Music4 },
  33: { label: 'Synth 3', Glyph: Music4 },
  34: { label: 'Synth 4', Glyph: Music4 },
  35: { label: 'Trumpet', Glyph: Music2 },
  36: { label: 'Trombone', Glyph: Music2 },
  37: { label: 'Saxophone', Glyph: Music2 },
  38: { label: 'Clarinet', Glyph: Music2 },
  39: { label: 'Violin', Glyph: Music2 },
  40: { label: 'Cello', Glyph: Music2 },
  41: { label: 'Male singer', Glyph: Mic2 },
  42: { label: 'Female singer', Glyph: Mic2 },
  43: { label: 'Choir', Glyph: Users },
  44: { label: 'Hand sign', Glyph: Hand },
  45: { label: 'Talkback A', Glyph: Megaphone },
  46: { label: 'Talkback B', Glyph: Megaphone },
  47: { label: 'Mic 1', Glyph: Mic },
  48: { label: 'Condenser mic (L)', Glyph: Mic },
  49: { label: 'Condenser mic (R)', Glyph: Mic },
  50: { label: 'Mic 2', Glyph: Mic },
  51: { label: 'Wireless mic', Glyph: Mic },
  52: { label: 'Table mic', Glyph: Mic },
  53: { label: 'In-ear', Glyph: Headphones },
  54: { label: 'XLR', Glyph: Cable },
  55: { label: 'TRS', Glyph: Cable },
  56: { label: 'TRS (L)', Glyph: Cable },
  57: { label: 'TRS (R)', Glyph: Cable },
  58: { label: 'Cinch (L)', Glyph: Cable },
  59: { label: 'Cinch (R)', Glyph: Cable },
  60: { label: 'Tape recorder', Glyph: Disc },
  61: { label: 'FX', Glyph: Sparkles },
  62: { label: 'PC', Glyph: Laptop },
  63: { label: 'Wedge', Glyph: Speaker },
  64: { label: 'Speaker rig', Glyph: Speaker },
};

export function getIconGlyph(id: number): IconDef {
  return ICONS[id] ?? { label: `Icon ${id}`, Glyph: Music };
}

export function iconLabel(id: number): string {
  return getIconGlyph(id).label;
}

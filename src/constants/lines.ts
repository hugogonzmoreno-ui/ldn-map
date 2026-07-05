// Official TfL line colours and mode metadata, used for badges and map markers.
// Colours from the TfL colour standard (https://content.tfl.gov.uk/tfl-colour-standard.pdf).

import type { TflMode } from '@/types/tfl';

/** Hex colour for a given TfL line id (lower-case). */
export const LINE_COLORS: Record<string, string> = {
  bakerloo: '#B36305',
  central: '#E32017',
  circle: '#FFD300',
  district: '#00782A',
  'hammersmith-city': '#F3A9BB',
  jubilee: '#A0A5A9',
  metropolitan: '#9B0056',
  northern: '#000000',
  piccadilly: '#003688',
  victoria: '#0098D4',
  'waterloo-city': '#95CDBA',
  // Overground (single brand colour) and the named Overground lines (2024 rebrand).
  london_overground: '#EE7C0E',
  overground: '#EE7C0E',
  lioness: '#FAA61A',
  mildmay: '#0077AD',
  windrush: '#EE2E24',
  weaver: '#823A62',
  suffragette: '#28A197',
  liberty: '#5C5C5C',
  // Elizabeth line, DLR, tram.
  elizabeth: '#6950A1',
  'elizabeth-line': '#6950A1',
  dlr: '#00A4A7',
  tram: '#5FB709',
  tramlink: '#5FB709',
};

/** Fallback colours by mode when a specific line colour is unknown. */
export const MODE_COLORS: Record<string, string> = {
  tube: '#0019A8',
  bus: '#E32017',
  dlr: '#00A4A7',
  overground: '#EE7C0E',
  'elizabeth-line': '#6950A1',
  tram: '#5FB709',
  'national-rail': '#C00000',
  'river-bus': '#0057A8',
  walking: '#4A4A4A',
};

/** Ionicons name per mode, for markers and leg rows. */
export const MODE_ICONS: Record<string, string> = {
  tube: 'subway',
  bus: 'bus',
  dlr: 'train',
  overground: 'train',
  'elizabeth-line': 'train',
  tram: 'train',
  'national-rail': 'train',
  'river-bus': 'boat',
  walking: 'walk',
};

/** Modes requested for the Line Status screen. */
export const STATUS_MODES = ['tube', 'dlr', 'overground', 'elizabeth-line', 'tram'];

export function lineColor(lineId?: string, mode?: TflMode): string {
  if (lineId && LINE_COLORS[lineId.toLowerCase()]) {
    return LINE_COLORS[lineId.toLowerCase()];
  }
  if (mode && MODE_COLORS[mode]) return MODE_COLORS[mode];
  return '#4A4A4A';
}

export function modeColor(mode?: TflMode): string {
  if (mode && MODE_COLORS[mode]) return MODE_COLORS[mode];
  return '#4A4A4A';
}

export function modeIcon(mode?: TflMode): string {
  if (mode && MODE_ICONS[mode]) return MODE_ICONS[mode];
  return 'location';
}

/**
 * A readable text colour (black/white) for a given background hex, so line
 * badges stay legible on light colours like the yellow Circle line.
 */
export function contrastText(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#FFFFFF';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Perceived luminance (ITU-R BT.601).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

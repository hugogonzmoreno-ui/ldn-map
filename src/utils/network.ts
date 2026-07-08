// Helpers for the whole-network tube overlay: dedupe stations across lines and
// map line ids to a mode for colouring/synthesised stops.

import type { LineRoute, Stop, TflMode } from '@/types/tfl';

export interface NetworkStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Every line calling here — length > 1 marks an interchange. */
  lineIds: string[];
}

const OVERGROUND_LINES = new Set([
  'london_overground',
  'overground',
  'lioness',
  'mildmay',
  'windrush',
  'weaver',
  'suffragette',
  'liberty',
]);

/** Mode for a line id, for colouring and synthesised Stop objects. */
export function modeForLine(lineId: string): TflMode {
  const id = lineId.toLowerCase();
  if (id === 'dlr') return 'dlr';
  if (id === 'elizabeth' || id === 'elizabeth-line') return 'elizabeth-line';
  if (id === 'tram' || id === 'tramlink') return 'tram';
  if (OVERGROUND_LINES.has(id)) return 'overground';
  return 'tube';
}

/** All stations across the loaded routes, deduped by stop id. */
export function collectStations(routes: LineRoute[]): NetworkStation[] {
  const byId = new Map<string, NetworkStation>();
  for (const route of routes) {
    for (const s of route.stations) {
      const existing = byId.get(s.id);
      if (existing) {
        if (!existing.lineIds.includes(route.lineId)) {
          existing.lineIds.push(route.lineId);
        }
      } else {
        byId.set(s.id, {
          id: s.id,
          name: s.name,
          lat: s.lat,
          lon: s.lon,
          lineIds: [route.lineId],
        });
      }
    }
  }
  return [...byId.values()];
}

/** Synthesise a selectable Stop from an overlay station so tapping a station
 *  dot opens the same live-arrivals sheet as a nearby-stop marker. */
export function stationToStop(station: NetworkStation): Stop {
  const primaryMode = modeForLine(station.lineIds[0] ?? 'tube');
  return {
    id: station.id,
    name: station.name,
    lat: station.lat,
    lon: station.lon,
    modes: [...new Set(station.lineIds.map(modeForLine))],
    primaryMode,
  };
}

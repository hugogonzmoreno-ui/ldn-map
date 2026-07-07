// Derives live train positions from TfL data. TfL publishes no GPS feed for
// trains; like Citymapper, we estimate each train's position from its arrival
// predictions: a train (vehicleId) is placed between the previous and next
// station on the line's route, interpolated by its time-to-next-station.

import type {
  LatLng,
  LineRoute,
  RawPrediction,
  RouteSequence,
  RouteStop,
  TrainPosition,
} from '@/types/tfl';
import { formatCountdown, stripStationSuffix } from '@/utils/format';

/** Assumed travel time between adjacent stations, for interpolation. */
const SEGMENT_SECONDS = 120;
/** Below this the train is drawn at the platform. */
const AT_STATION_SECONDS = 30;

function isPair(node: unknown): node is [number, number] {
  return (
    Array.isArray(node) &&
    node.length >= 2 &&
    typeof node[0] === 'number' &&
    typeof node[1] === 'number'
  );
}

/**
 * Decode Route/Sequence `lineStrings` — JSON-encoded arrays of coordinate
 * pairs at varying nesting depths. TfL uses [lon, lat] order here (GeoJSON
 * style), unlike journey paths which are [lat, lon]; detect order per line
 * (around London, |lat| ≈ 51 and |lon| < 2, so they can't be confused).
 */
export function decodeRouteLineStrings(lineStrings?: string[]): LatLng[][] {
  const polylines: LatLng[][] = [];
  const walk = (node: unknown) => {
    if (!Array.isArray(node) || node.length === 0) return;
    if (node.every(isPair)) {
      const pairs = node as [number, number][];
      const latFirst = Math.abs(pairs[0][0]) > 40;
      const line = pairs.map(([a, b]) =>
        latFirst ? { latitude: a, longitude: b } : { latitude: b, longitude: a }
      );
      if (line.length > 1) polylines.push(line);
      return;
    }
    node.forEach(walk);
  };
  (lineStrings ?? []).forEach((s) => {
    try {
      walk(JSON.parse(s));
    } catch {
      // skip malformed geometry
    }
  });
  return polylines;
}

interface StopMatch {
  sequence: RouteSequence;
  index: number;
}

function findStop(
  sequences: RouteSequence[],
  prediction: RawPrediction
): StopMatch | null {
  const direction = prediction.direction;
  const ordered = direction
    ? [
        ...sequences.filter((s) => s.direction === direction),
        ...sequences.filter((s) => s.direction !== direction),
      ]
    : sequences;
  for (const sequence of ordered) {
    const byId = prediction.naptanId
      ? sequence.stops.findIndex((st) => st.id === prediction.naptanId)
      : -1;
    if (byId >= 0) return { sequence, index: byId };
    const byName = prediction.stationName
      ? sequence.stops.findIndex((st) => st.name === prediction.stationName)
      : -1;
    if (byName >= 0) return { sequence, index: byName };
  }
  return null;
}

function lerp(from: RouteStop, to: RouteStop, fraction: number): LatLng {
  return {
    latitude: to.lat + (from.lat - to.lat) * fraction,
    longitude: to.lon + (from.lon - to.lon) * fraction,
  };
}

/**
 * Estimate every train's position on a line. `predictions` come from
 * /Line/{id}/Arrivals (one prediction per train per upcoming station).
 */
export function computeTrainPositions(
  predictions: RawPrediction[],
  route: LineRoute
): TrainPosition[] {
  const byVehicle = new Map<string, RawPrediction[]>();
  predictions.forEach((p) => {
    if (!p.vehicleId || p.vehicleId === '000' || p.timeToStation == null) return;
    const list = byVehicle.get(p.vehicleId) ?? [];
    list.push(p);
    byVehicle.set(p.vehicleId, list);
  });

  const trains: TrainPosition[] = [];
  byVehicle.forEach((preds, vehicleId) => {
    // The train's next stop is its soonest prediction.
    const next = preds.reduce((a, b) =>
      (a.timeToStation ?? Infinity) <= (b.timeToStation ?? Infinity) ? a : b
    );
    const match = findStop(route.sequences, next);
    if (!match) return;

    const { sequence, index } = match;
    const nextStop = sequence.stops[index];
    const prevStop = index > 0 ? sequence.stops[index - 1] : null;
    const t = next.timeToStation ?? 0;

    const position =
      !prevStop || t <= AT_STATION_SECONDS
        ? { latitude: nextStop.lat, longitude: nextStop.lon }
        : lerp(prevStop, nextStop, Math.min(1, t / SEGMENT_SECONDS));

    const nextStopName = stripStationSuffix(nextStop.name || next.stationName || '');
    trains.push({
      vehicleId,
      lat: position.latitude,
      lon: position.longitude,
      lineId: next.lineId ?? route.lineId,
      towards: next.towards || stripStationSuffix(next.destinationName ?? '') || '—',
      label:
        next.currentLocation || `${formatCountdown(t)} to ${nextStopName}`,
      nextStopName,
      timeToNext: t,
    });
  });

  return trains.sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));
}

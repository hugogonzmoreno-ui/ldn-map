// Typed client for the TfL Unified API (https://api.tfl.gov.uk).
//
// Works WITHOUT an API key at low request volumes. If `EXPO_PUBLIC_TFL_APP_KEY`
// is provided it is appended as `app_key` for higher rate limits. All functions
// normalise the raw API responses into the lean view-model types in `types/tfl.ts`.

import {
  Arrival,
  Journey,
  JourneyLeg,
  LineStatus,
  RawJourney,
  RawJourneyResponse,
  RawLine,
  RawPrediction,
  RawSearchResponse,
  RawStopPoint,
  RawStopPointsResponse,
  Stop,
  TflMode,
} from '@/types/tfl';
import { decodeLineString } from '@/utils/format';

const BASE_URL = 'https://api.tfl.gov.uk';

const NEARBY_STOP_TYPES = [
  'NaptanMetroStation',
  'NaptanRailStation',
  'NaptanPublicBusCoachTram',
].join(',');

/** Preference order for choosing a stop's primary (colouring) mode. */
const MODE_PRIORITY: TflMode[] = [
  'tube',
  'elizabeth-line',
  'dlr',
  'overground',
  'national-rail',
  'tram',
  'bus',
];

function buildUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const key = process.env.EXPO_PUBLIC_TFL_APP_KEY;
  if (key) url.searchParams.set('app_key', key);
  return url.toString();
}

async function getJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const res = await fetch(buildUrl(path, params));
  if (!res.ok) {
    // 300 = journey disambiguation; surface a friendly message upstream.
    throw new Error(`TfL API error ${res.status}`);
  }
  return (await res.json()) as T;
}

function pickPrimaryMode(modes: string[]): TflMode {
  for (const m of MODE_PRIORITY) {
    if (modes.includes(m)) return m;
  }
  return modes[0] ?? 'bus';
}

function normaliseStop(raw: RawStopPoint): Stop | null {
  const id = raw.id ?? raw.naptanId;
  if (!id || raw.lat == null || raw.lon == null) return null;
  const modes = raw.modes ?? [];
  return {
    id,
    name: raw.commonName ?? 'Unknown stop',
    lat: raw.lat,
    lon: raw.lon,
    modes,
    distance: raw.distance,
    primaryMode: pickPrimaryMode(modes),
  };
}

/** Nearby stops within `radius` metres of a coordinate, closest first. */
export async function getNearbyStops(
  lat: number,
  lon: number,
  radius = 750
): Promise<Stop[]> {
  const data = await getJson<RawStopPointsResponse>('/StopPoint', {
    lat: String(lat),
    lon: String(lon),
    radius: String(radius),
    stopTypes: NEARBY_STOP_TYPES,
  });
  return (data.stopPoints ?? [])
    .map(normaliseStop)
    .filter((s): s is Stop => s !== null)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}

/** Free-text stop search (used by the map search bar and journey inputs). */
export async function searchStops(query: string): Promise<Stop[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await getJson<RawSearchResponse>(
    `/StopPoint/Search/${encodeURIComponent(q)}`,
    { modes: 'tube,dlr,overground,elizabeth-line,tram,national-rail,bus' }
  );
  return (data.matches ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    lat: m.lat ?? 0,
    lon: m.lon ?? 0,
    modes: (m.modes ?? []) as TflMode[],
    primaryMode: pickPrimaryMode(m.modes ?? []),
  }));
}

/** Stop types that report their own arrival predictions. */
const ARRIVAL_STOP_TYPES = new Set([
  'NaptanMetroStation',
  'NaptanRailStation',
  'NaptanPublicBusCoachTram',
]);

/**
 * Descendant stop ids of a hub / parent station (e.g. "Canary Wharf" the hub
 * contains the Jubilee, DLR and Elizabeth line stations). Hubs report no
 * arrivals themselves — their children do.
 */
async function getChildStopIds(stopId: string): Promise<string[]> {
  try {
    const detail = await getJson<RawStopPoint>(
      `/StopPoint/${encodeURIComponent(stopId)}`
    );
    const ids = new Set<string>();
    const walk = (sp: RawStopPoint, depth: number) => {
      const id = sp.id ?? sp.naptanId;
      if (id && id !== stopId && ARRIVAL_STOP_TYPES.has(sp.stopType ?? '')) {
        ids.add(id);
      }
      if (depth < 2) (sp.children ?? []).forEach((c) => walk(c, depth + 1));
    };
    walk(detail, 0);
    return [...ids];
  } catch {
    return [];
  }
}

/**
 * Live arrival predictions for a stop, soonest first. If the stop itself has
 * no predictions (typical for hubs / parent interchanges), aggregate the
 * arrivals of its child stations instead.
 */
export async function getArrivals(stopId: string): Promise<Arrival[]> {
  let predictions = await getJson<RawPrediction[]>(
    `/StopPoint/${encodeURIComponent(stopId)}/Arrivals`
  );
  if (predictions.length === 0) {
    // Cap fan-out to keep well within keyless rate limits.
    const childIds = (await getChildStopIds(stopId)).slice(0, 8);
    if (childIds.length > 0) {
      const results = await Promise.all(
        childIds.map((id) =>
          getJson<RawPrediction[]>(
            `/StopPoint/${encodeURIComponent(id)}/Arrivals`
          ).catch(() => [] as RawPrediction[])
        )
      );
      const seen = new Set<string>();
      predictions = results.flat().filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    }
  }
  return predictions
    .map((p) => normaliseArrival(p))
    .sort((a, b) => a.timeToStation - b.timeToStation);
}

/** Exported for unit testing the normalisation logic. */
export function normaliseArrival(p: RawPrediction): Arrival {
  return {
    id: p.id,
    lineId: p.lineId ?? '',
    lineName: p.lineName ?? '',
    destinationName: (p.destinationName ?? p.towards ?? 'Check front of vehicle').replace(
      / Underground Station| Rail Station| DLR Station/i,
      ''
    ),
    platformName: p.platformName ?? '',
    towards: p.towards ?? '',
    timeToStation: p.timeToStation ?? 0,
    modeName: (p.modeName ?? 'bus') as TflMode,
  };
}

/** Live status for the major rail modes. */
export async function getLineStatuses(modes: string[]): Promise<LineStatus[]> {
  const data = await getJson<RawLine[]>(
    `/Line/Mode/${encodeURIComponent(modes.join(','))}/Status`
  );
  return data.map(normaliseLineStatus);
}

/** Exported for unit testing. */
export function normaliseLineStatus(line: RawLine): LineStatus {
  const status = line.lineStatuses?.[0];
  const description = status?.statusSeverityDescription ?? 'Unknown';
  const reason =
    status?.reason ?? status?.disruption?.description ?? status?.disruption?.closureText;
  return {
    id: line.id,
    name: line.name,
    modeName: (line.modeName ?? 'tube') as TflMode,
    statusSeverity: status?.statusSeverity ?? 10,
    statusDescription: description,
    reason: reason || undefined,
    // Severity 10 == Good Service; anything else is a disruption/notice.
    hasDisruption: (status?.statusSeverity ?? 10) !== 10,
  };
}

export interface JourneyOptions {
  /** 'departing' | 'arriving' — how `dateTime` is interpreted. */
  timeIs?: 'departing' | 'arriving';
  /** ISO-ish local time; omit for "leave now". */
  date?: string; // yyyyMMdd
  time?: string; // HHmm
}

/**
 * Plan a journey between two points. `from`/`to` may be a stop id, a "lat,lon"
 * string, or a postcode/place name. Throws with a friendly message when TfL
 * cannot resolve the endpoints (HTTP 300 disambiguation).
 */
export async function planJourney(
  from: string,
  to: string,
  opts: JourneyOptions = {}
): Promise<Journey[]> {
  const params: Record<string, string> = {};
  if (opts.date) params.date = opts.date;
  if (opts.time) params.time = opts.time;
  if (opts.timeIs) params.timeIs = opts.timeIs === 'arriving' ? 'Arriving' : 'Departing';

  let data: RawJourneyResponse;
  try {
    data = await getJson<RawJourneyResponse>(
      `/Journey/JourneyResults/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`,
      params
    );
  } catch (e) {
    throw new Error(
      'Could not plan that journey. Try picking stops from the suggestions.'
    );
  }
  return (data.journeys ?? []).map((j, i) => normaliseJourney(j, i));
}

/** Exported for unit testing. */
export function normaliseJourney(j: RawJourney, index: number): Journey {
  const rawLegs = j.legs ?? [];
  const legs: JourneyLeg[] = rawLegs.map((l) => {
    const route = l.routeOptions?.[0];
    const mode = (l.mode?.id ?? 'walking') as TflMode;
    return {
      mode,
      lineId: route?.lineIdentifier?.id,
      lineName: route?.lineIdentifier?.name ?? route?.name,
      summary: l.instruction?.summary ?? '',
      direction: route?.directions?.[0],
      durationMins: l.duration ?? 0,
      departureTime: l.departureTime,
      arrivalTime: l.arrivalTime,
      fromName: l.departurePoint?.commonName ?? '',
      toName: l.arrivalPoint?.commonName ?? '',
      path: decodeLineString(l.path?.lineString),
      isDisrupted: l.isDisrupted ?? false,
    };
  });
  // "Changes" = number of non-walking transit legs minus one (0 if direct).
  const transitLegs = legs.filter((l) => l.mode !== 'walking').length;
  return {
    id: `${index}`,
    startDateTime: j.startDateTime,
    arrivalDateTime: j.arrivalDateTime,
    durationMins: j.duration ?? 0,
    changes: Math.max(0, transitLegs - 1),
    legs,
  };
}

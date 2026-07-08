// Typed client for the TfL Unified API (https://api.tfl.gov.uk).
//
// Works WITHOUT an API key at low request volumes. If `EXPO_PUBLIC_TFL_APP_KEY`
// is provided it is appended as `app_key` for higher rate limits. All functions
// normalise the raw API responses into the lean view-model types in `types/tfl.ts`.

import {
  Arrival,
  Journey,
  JourneyLeg,
  LineRoute,
  LineStatus,
  RawDisambiguation,
  RawDisambiguationSide,
  RawJourney,
  RawJourneyResponse,
  RawLine,
  RawPrediction,
  RawRouteSequence,
  RawSearchResponse,
  RawStopPoint,
  RawStopPointsResponse,
  RouteStop,
  Stop,
  TflMode,
} from '@/types/tfl';
import { decodeLineString, stripStationSuffix } from '@/utils/format';
import { decodeRouteLineStrings } from '@/utils/trains';

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

const FETCH_TIMEOUT_MS = 15_000;

/** fetch that gives up after FETCH_TIMEOUT_MS instead of hanging on bad mobile signal. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const res = await fetchWithTimeout(buildUrl(path, params));
  if (!res.ok) {
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
 * Live arrival predictions for a stop, soonest first. Hubs / parent
 * interchanges (HUB… ids) hold their real arrivals on their child stations,
 * so for hubs — or any stop that reports nothing itself — aggregate the
 * children's arrivals too (deduped against anything the stop did report).
 */
export async function getArrivals(stopId: string): Promise<Arrival[]> {
  let predictions = await getJson<RawPrediction[]>(
    `/StopPoint/${encodeURIComponent(stopId)}/Arrivals`
  );
  const isHub = stopId.toUpperCase().startsWith('HUB');
  if (isHub || predictions.length === 0) {
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
      const seen = new Set<string>(predictions.map((p) => p.id));
      predictions = predictions.concat(
        results.flat().filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        })
      );
    }
  }
  return predictions
    // A prediction without a numeric countdown would masquerade as "Due".
    .filter((p) => p.timeToStation != null)
    .map((p) => normaliseArrival(p))
    .sort((a, b) => a.timeToStation - b.timeToStation);
}

/** Exported for unit testing the normalisation logic. */
export function normaliseArrival(p: RawPrediction): Arrival {
  return {
    id: p.id,
    lineId: p.lineId ?? '',
    lineName: p.lineName ?? '',
    destinationName: stripStationSuffix(
      p.destinationName ?? p.towards ?? 'Check front of vehicle'
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

/**
 * A line's route geometry and ordered station sequences (both directions),
 * used by the live train map. Geometry rarely changes — cache aggressively.
 */
export async function getLineRoute(lineId: string): Promise<LineRoute> {
  const data = await getJson<RawRouteSequence>(
    `/Line/${encodeURIComponent(lineId)}/Route/Sequence/all`,
    { serviceTypes: 'Regular' }
  );
  const sequences = (data.stopPointSequences ?? []).map((seq) => ({
    direction: seq.direction ?? '',
    stops: (seq.stopPoint ?? [])
      // Real coordinates only — London straddles longitude 0, so test for
      // missing fields rather than falsy values.
      .filter((p) => p.lat != null && p.lon != null && (p.stationId || p.id))
      .map((p) => ({
        id: p.stationId ?? p.id ?? '',
        altId: p.id && p.id !== p.stationId ? p.id : undefined,
        name: p.name ?? '',
        lat: p.lat!,
        lon: p.lon!,
      })),
  }));
  let polylines = decodeRouteLineStrings(data.lineStrings);
  if (polylines.length === 0) {
    // Fallback: connect the station dots if TfL sent no geometry.
    polylines = sequences
      .map((s) => s.stops.map((st) => ({ latitude: st.lat, longitude: st.lon })))
      .filter((line) => line.length > 1);
  }
  // One entry per physical station (sequences repeat them per direction, and
  // loop lines repeat them within a direction) for rendering markers once.
  const byId = new Map<string, RouteStop>();
  sequences.forEach((s) => s.stops.forEach((st) => byId.set(st.id, st)));
  return { lineId, polylines, sequences, stations: [...byId.values()] };
}

/** Every live arrival prediction on a line (one per train per upcoming stop). */
export async function getLineArrivals(lineId: string): Promise<RawPrediction[]> {
  return getJson<RawPrediction[]>(`/Line/${encodeURIComponent(lineId)}/Arrivals`);
}

export interface JourneyOptions {
  /** 'departing' | 'arriving' — how `dateTime` is interpreted. */
  timeIs?: 'departing' | 'arriving';
  /** ISO-ish local time; omit for "leave now". */
  date?: string; // yyyyMMdd
  time?: string; // HHmm
}

async function fetchJourneyRaw(
  from: string,
  to: string,
  params: Record<string, string>
): Promise<{ status: number; body: (RawJourneyResponse & RawDisambiguation) | null }> {
  const url = buildUrl(
    `/Journey/JourneyResults/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`,
    params
  );
  const res = await fetchWithTimeout(url);
  // 300 carries a disambiguation body we still need to read.
  const body = res.ok || res.status === 300 ? await res.json() : null;
  return { status: res.status, body };
}

/**
 * Plan a journey between two points. `from`/`to` may be a stop id, a "lat,lon"
 * string, or a postcode/place name. When TfL answers HTTP 300 (ambiguous
 * endpoint — common for hub ids picked from search), retry once with TfL's own
 * best disambiguation match for each side.
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

  try {
    let result = await fetchJourneyRaw(from, to, params);
    if (result.status === 300 && result.body) {
      const pick = (side: RawDisambiguationSide | undefined, fallback: string) =>
        side?.disambiguationOptions?.[0]?.parameterValue ?? fallback;
      const newFrom = pick(result.body.fromLocationDisambiguation, from);
      const newTo = pick(result.body.toLocationDisambiguation, to);
      if (newFrom !== from || newTo !== to) {
        result = await fetchJourneyRaw(newFrom, newTo, params);
      }
    }
    if (result.status >= 200 && result.status < 300 && result.body) {
      return (result.body.journeys ?? []).map((j, i) => normaliseJourney(j, i));
    }
  } catch {
    // fall through to the friendly error below
  }
  throw new Error(
    'Could not plan that journey. Try picking stops from the suggestions.'
  );
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

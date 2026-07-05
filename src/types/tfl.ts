// Types for the subset of the TfL Unified API (https://api.tfl.gov.uk) that this
// app consumes. These mirror the raw API shapes; the client in `services/tfl.ts`
// normalises them into the lighter view-model types exported at the bottom.

export type TflMode =
  | 'tube'
  | 'bus'
  | 'dlr'
  | 'overground'
  | 'elizabeth-line'
  | 'tram'
  | 'national-rail'
  | 'river-bus'
  | 'walking'
  | string;

/** Raw StopPoint as returned by /StopPoint and /StopPoint/{id}. */
export interface RawStopPoint {
  naptanId?: string;
  id?: string;
  commonName?: string;
  stopType?: string;
  lat?: number;
  lon?: number;
  distance?: number;
  modes?: string[];
  lines?: { id: string; name: string }[];
  children?: RawStopPoint[];
}

/** Wrapper for /StopPoint?lat=&lon=... */
export interface RawStopPointsResponse {
  stopPoints?: RawStopPoint[];
}

/** Match item from /StopPoint/Search/{query}. */
export interface RawSearchMatch {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
  modes?: string[];
}

export interface RawSearchResponse {
  matches?: RawSearchMatch[];
  total?: number;
}

/** Raw arrival prediction from /StopPoint/{id}/Arrivals. */
export interface RawPrediction {
  id: string;
  naptanId?: string;
  stationName?: string;
  lineId?: string;
  lineName?: string;
  platformName?: string;
  direction?: string;
  destinationName?: string;
  towards?: string;
  timeToStation?: number; // seconds
  expectedArrival?: string; // ISO
  modeName?: string;
}

/** Raw line status from /Line/Mode/{modes}/Status. */
export interface RawLineStatus {
  id: number;
  statusSeverity: number;
  statusSeverityDescription: string;
  reason?: string;
  disruption?: {
    category?: string;
    description?: string;
    closureText?: string;
  };
}

export interface RawLine {
  id: string;
  name: string;
  modeName?: string;
  lineStatuses?: RawLineStatus[];
}

/** Raw journey planner leg from /Journey/JourneyResults. */
export interface RawLeg {
  duration?: number; // minutes
  instruction?: { summary?: string; detailed?: string };
  departureTime?: string;
  arrivalTime?: string;
  departurePoint?: { commonName?: string; lat?: number; lon?: number };
  arrivalPoint?: { commonName?: string; lat?: number; lon?: number };
  path?: { lineString?: string };
  routeOptions?: {
    name?: string;
    directions?: string[];
    lineIdentifier?: { id?: string; name?: string };
  }[];
  mode?: { id?: string; name?: string };
  isDisrupted?: boolean;
}

export interface RawJourney {
  startDateTime?: string;
  arrivalDateTime?: string;
  duration?: number; // minutes
  legs?: RawLeg[];
}

export interface RawJourneyResponse {
  journeys?: RawJourney[];
}

/** Returned (HTTP 300) when from/to is ambiguous. */
export interface RawDisambiguation {
  fromLocationDisambiguation?: { disambiguationOptions?: unknown[] };
  toLocationDisambiguation?: { disambiguationOptions?: unknown[] };
}

// ---------------------------------------------------------------------------
// Normalised view-model types used by the UI.
// ---------------------------------------------------------------------------

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  modes: TflMode[];
  distance?: number;
  /** Primary mode used for colouring/icon selection. */
  primaryMode: TflMode;
}

export interface Arrival {
  id: string;
  lineId: string;
  lineName: string;
  destinationName: string;
  platformName: string;
  towards: string;
  timeToStation: number; // seconds
  modeName: TflMode;
}

export interface LineStatus {
  id: string;
  name: string;
  modeName: TflMode;
  statusSeverity: number;
  statusDescription: string;
  reason?: string;
  hasDisruption: boolean;
}

export interface JourneyLeg {
  mode: TflMode;
  lineId?: string;
  lineName?: string;
  summary: string;
  direction?: string;
  durationMins: number;
  departureTime?: string;
  arrivalTime?: string;
  fromName: string;
  toName: string;
  /** Decoded [latitude, longitude] path points, when available. */
  path: { latitude: number; longitude: number }[];
  isDisrupted: boolean;
}

export interface Journey {
  id: string;
  startDateTime?: string;
  arrivalDateTime?: string;
  durationMins: number;
  changes: number;
  legs: JourneyLeg[];
}

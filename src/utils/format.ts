// Small formatting helpers shared across screens.

/** Convert TfL `timeToStation` (seconds) into a short countdown label. */
export function formatCountdown(seconds: number): string {
  if (seconds <= 30) return 'Due';
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

/** Short "HH:MM" from an ISO date string. Returns '' if unparseable. */
export function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** "25 min" / "1 hr 5 min" from a whole number of minutes. */
export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * Decode a TfL `path.lineString` — a JSON-encoded string of `[[lat, lon], ...]`
 * pairs — into map-ready coordinate objects. Returns [] on any parse failure.
 */
export function decodeLineString(
  lineString?: string
): { latitude: number; longitude: number }[] {
  if (!lineString) return [];
  try {
    const pairs = JSON.parse(lineString) as unknown;
    if (!Array.isArray(pairs)) return [];
    return pairs
      .filter(
        (p): p is [number, number] =>
          Array.isArray(p) &&
          p.length >= 2 &&
          typeof p[0] === 'number' &&
          typeof p[1] === 'number'
      )
      .map(([latitude, longitude]) => ({ latitude, longitude }));
  } catch {
    return [];
  }
}

/** Drop station-type suffixes: "Oxford Circus Underground Station" -> "Oxford Circus". */
export function stripStationSuffix(name: string): string {
  return name.replace(/ (Underground|Rail|DLR) Station$/i, '').trim();
}

/** Title-case a hyphenated mode id, e.g. "elizabeth-line" -> "Elizabeth line". */
export function prettyMode(mode: string): string {
  const label = mode.replace(/-/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

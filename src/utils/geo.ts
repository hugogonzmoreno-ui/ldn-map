import type { LatLng } from '@/types/tfl';

export interface Region extends LatLng {
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Map region covering all `points`, padded by `padFactor`, or null when there
 * are no points (callers choose their own fallback view).
 */
export function regionForPoints(
  points: LatLng[],
  padFactor = 1.2,
  minDelta = 0.02
): Region | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * padFactor),
    longitudeDelta: Math.max(minDelta, (maxLon - minLon) * padFactor),
  };
}

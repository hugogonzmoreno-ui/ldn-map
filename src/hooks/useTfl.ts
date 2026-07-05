// React Query hooks wrapping the TfL client. Polling intervals drive the
// "real-time" feel: arrivals refresh every 30s, line status every 60s.

import { useQuery } from '@tanstack/react-query';
import {
  getArrivals,
  getLineStatuses,
  getNearbyStops,
  JourneyOptions,
  planJourney,
  searchStops,
} from '@/services/tfl';
import { STATUS_MODES } from '@/constants/lines';

export function useNearbyStops(
  coords: { lat: number; lon: number } | null,
  radius = 750
) {
  return useQuery({
    queryKey: ['nearbyStops', coords?.lat, coords?.lon, radius],
    queryFn: () => getNearbyStops(coords!.lat, coords!.lon, radius),
    enabled: !!coords,
    staleTime: 60_000,
  });
}

export function useArrivals(stopId: string | null) {
  return useQuery({
    queryKey: ['arrivals', stopId],
    queryFn: () => getArrivals(stopId!),
    enabled: !!stopId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useLineStatuses() {
  return useQuery({
    queryKey: ['lineStatus'],
    queryFn: () => getLineStatuses(STATUS_MODES),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStopSearch(query: string) {
  return useQuery({
    queryKey: ['stopSearch', query],
    queryFn: () => searchStops(query),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60_000,
  });
}

export function useJourney(
  from: string | null,
  to: string | null,
  opts: JourneyOptions = {}
) {
  return useQuery({
    queryKey: ['journey', from, to, opts.timeIs, opts.date, opts.time],
    queryFn: () => planJourney(from!, to!, opts),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

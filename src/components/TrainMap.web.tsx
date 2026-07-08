import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { formatCountdown, stripStationSuffix } from '@/utils/format';
import type { LineRoute, TrainPosition } from '@/types/tfl';

interface Props {
  route: LineRoute | undefined;
  trains: TrainPosition[];
  color: string;
}

/**
 * Web live-train map (Leaflet + OSM): the line's route drawn in its official
 * colour, small station dots, and a larger pulsing dot per train that moves
 * as predictions refresh. Native equivalent: TrainMap.tsx.
 */
export default function TrainMap({ route, trains, color }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const trainLayerRef = useRef<L.LayerGroup | null>(null);
  const trainMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [51.5074, -0.1278],
      zoom: 11,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    trainLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      trainLayerRef.current = null;
      trainMarkersRef.current.clear();
    };
  }, []);

  // Redraw route + stations and fit the view when the selected line changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!route) return;

    const all: L.LatLngExpression[] = [];
    route.polylines.forEach((line) => {
      const coords = line.map(
        (p) => [p.latitude, p.longitude] as L.LatLngExpression
      );
      all.push(...coords);
      L.polyline(coords, { color, weight: 4, opacity: 0.85 }).addTo(layer);
    });
    // Stations come pre-deduped (loop lines repeat stops within a sequence).
    route.stations.forEach((stop) => {
      L.circleMarker([stop.lat, stop.lon], {
        radius: 3.5,
        color,
        weight: 2,
        fillColor: '#FFFFFF',
        fillOpacity: 1,
      })
        .bindTooltip(stripStationSuffix(stop.name))
        .addTo(layer);
    });
    if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.05));
    // A new line invalidates the per-vehicle markers.
    trainMarkersRef.current.forEach((m) => m.remove());
    trainMarkersRef.current.clear();
    trainLayerRef.current?.clearLayers();
  }, [route, color]);

  // Diff train markers by vehicleId each refresh: existing trains glide to
  // their new position instead of the whole layer being rebuilt (no flicker).
  useEffect(() => {
    const layer = trainLayerRef.current;
    if (!layer) return;
    const markers = trainMarkersRef.current;
    const seen = new Set<string>();
    trains.forEach((train) => {
      seen.add(train.vehicleId);
      const tooltip = `🚆 → ${train.towards}<br/>${train.label}<br/>${formatCountdown(
        train.timeToNext
      )} to ${train.nextStopName}`;
      const existing = markers.get(train.vehicleId);
      if (existing) {
        existing.setLatLng([train.lat, train.lon]);
        existing.setTooltipContent(tooltip);
        return;
      }
      const marker = L.circleMarker([train.lat, train.lon], {
        radius: 8,
        color: '#FFFFFF',
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindTooltip(tooltip)
        .addTo(layer);
      markers.set(train.vehicleId, marker);
    });
    markers.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    });
  }, [trains, color]);

  return (
    <div style={{ position: 'relative', flexGrow: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}

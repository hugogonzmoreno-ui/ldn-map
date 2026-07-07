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
    route.sequences.forEach((seq) =>
      seq.stops.forEach((stop) => {
        L.circleMarker([stop.lat, stop.lon], {
          radius: 3.5,
          color,
          weight: 2,
          fillColor: '#FFFFFF',
          fillOpacity: 1,
        })
          .bindTooltip(stripStationSuffix(stop.name))
          .addTo(layer);
      })
    );
    if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.05));
  }, [route, color]);

  // Redraw train markers every refresh.
  useEffect(() => {
    const layer = trainLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    trains.forEach((train) => {
      L.circleMarker([train.lat, train.lon], {
        radius: 8,
        color: '#FFFFFF',
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindTooltip(
          `🚆 → ${train.towards}<br/>${train.label}<br/>${formatCountdown(
            train.timeToNext
          )} to ${train.nextStopName}`
        )
        .addTo(layer);
    });
  }, [trains, color]);

  return (
    <div style={{ position: 'relative', flexGrow: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}

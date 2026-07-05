import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { modeColor } from '@/constants/lines';
import type { JourneyLeg } from '@/types/tfl';

/** Web route overview using Leaflet: one coloured polyline per leg. */
export default function RouteMiniMap({ legs }: { legs: JourneyLeg[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const all: L.LatLngExpression[] = [];
    const drawn: L.Polyline[] = [];
    legs.forEach((leg) => {
      if (leg.path.length < 2) return;
      const coords = leg.path.map(
        (p) => [p.latitude, p.longitude] as L.LatLngExpression
      );
      all.push(...coords);
      drawn.push(
        L.polyline(coords, {
          color: modeColor(leg.mode),
          weight: leg.mode === 'walking' ? 3 : 5,
          dashArray: leg.mode === 'walking' ? '4 6' : undefined,
        }).addTo(map)
      );
    });
    if (all.length) {
      const start = all[0];
      const end = all[all.length - 1];
      L.circleMarker(start, { radius: 6, color: '#0A7A0A', fillOpacity: 1 }).addTo(map);
      L.circleMarker(end, { radius: 6, color: '#B00020', fillOpacity: 1 }).addTo(map);
      map.fitBounds(L.latLngBounds(all).pad(0.2));
    }
    return () => {
      drawn.forEach((p) => p.remove());
    };
  }, [legs]);

  return (
    <div
      ref={containerRef}
      style={{
        height: 200,
        margin: '16px 16px 0',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#E9E9E9',
      }}
    />
  );
}

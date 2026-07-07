import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { modeColor } from '@/constants/lines';
import type { Stop } from '@/types/tfl';

interface Props {
  region: { latitude: number; longitude: number };
  stops: Stop[];
  onSelectStop: (stop: Stop) => void;
  showsUser: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Real interactive map for the web build, using Leaflet + free OpenStreetMap
 * tiles. On Expo web the renderer is react-dom, so this `.web.tsx` file can
 * return real DOM and drive Leaflet directly. Native uses `MapPanel.tsx`.
 * Loading/error banners are rendered by the screen (like on native), so the
 * isLoading/isError/onRetry props are accepted but unused here.
 */
export default function MapPanel({ region, stops, onSelectStop }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [region.latitude, region.longitude],
      zoom: 14,
      zoomControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Leaflet needs a size recalculation once the flex container has laid out.
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentre when the region (e.g. user's GPS) changes.
  useEffect(() => {
    mapRef.current?.setView([region.latitude, region.longitude]);
  }, [region.latitude, region.longitude]);

  // Rebuild markers when the stop list changes.
  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();
    stops.forEach((stop) => {
      L.circleMarker([stop.lat, stop.lon], {
        radius: 7,
        color: '#FFFFFF',
        weight: 2,
        fillColor: modeColor(stop.primaryMode),
        fillOpacity: 1,
      })
        .bindTooltip(stop.name)
        .on('click', () => onSelectStop(stop))
        .addTo(layer);
    });
  }, [stops, onSelectStop]);

  return (
    <div style={{ position: 'relative', flexGrow: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { lineColor, modeColor } from '@/constants/lines';
import { collectStations, stationToStop } from '@/utils/network';
import type { LineRoute, Stop } from '@/types/tfl';

interface Props {
  region: { latitude: number; longitude: number };
  stops: Stop[];
  onSelectStop: (stop: Stop) => void;
  showsUser: boolean;
  /** Whole-network route geometry for the tube-map overlay. */
  routes?: LineRoute[];
}

// Station dots only appear once zoomed in enough to read them.
const STATION_MIN_ZOOM = 12;

/**
 * Real interactive map for the web build, using Leaflet + free OpenStreetMap
 * tiles: official-colour tube line polylines, zoom-gated station dots, and a
 * coloured dot per nearby stop. On Expo web the renderer is react-dom, so this
 * `.web.tsx` file can return real DOM and drive Leaflet directly. Native uses
 * `MapPanel.tsx`. Loading/error banners are rendered by the screen.
 */
export default function MapPanel({
  region,
  stops,
  onSelectStop,
  routes = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const linesRef = useRef<L.LayerGroup | null>(null);
  const stationsRef = useRef<L.LayerGroup | null>(null);
  const drawnLinesRef = useRef<Set<string>>(new Set());

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
    linesRef.current = L.layerGroup().addTo(map);
    stationsRef.current = L.layerGroup();
    if (map.getZoom() >= STATION_MIN_ZOOM) stationsRef.current.addTo(map);
    markersRef.current = L.layerGroup().addTo(map);

    // Stations toggle with zoom so the overview stays uncluttered.
    map.on('zoomend', () => {
      const stations = stationsRef.current;
      if (!stations) return;
      if (map.getZoom() >= STATION_MIN_ZOOM) {
        if (!map.hasLayer(stations)) stations.addTo(map);
      } else if (map.hasLayer(stations)) {
        map.removeLayer(stations);
      }
    });

    mapRef.current = map;
    // Leaflet needs a size recalculation once the flex container has laid out.
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      linesRef.current = null;
      stationsRef.current = null;
      drawnLinesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentre when the region (e.g. user's GPS) changes.
  useEffect(() => {
    mapRef.current?.setView([region.latitude, region.longitude]);
  }, [region.latitude, region.longitude]);

  const stations = useMemo(() => collectStations(routes), [routes]);

  // Draw each line's geometry once as it arrives (routes are static).
  useEffect(() => {
    const lines = linesRef.current;
    if (!lines) return;
    routes.forEach((route) => {
      if (drawnLinesRef.current.has(route.lineId)) return;
      drawnLinesRef.current.add(route.lineId);
      route.polylines.forEach((points) => {
        L.polyline(
          points.map((p) => [p.latitude, p.longitude] as [number, number]),
          {
            color: lineColor(route.lineId),
            weight: 3,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }
        ).addTo(lines);
      });
    });
  }, [routes]);

  // Rebuild the station layer when the (deduped) station set grows.
  useEffect(() => {
    const layer = stationsRef.current;
    if (!layer) return;
    layer.clearLayers();
    stations.forEach((st) => {
      const interchange = st.lineIds.length > 1;
      L.circleMarker([st.lat, st.lon], {
        radius: interchange ? 5.5 : 4,
        color: interchange ? '#111111' : lineColor(st.lineIds[0]),
        weight: 2.5,
        fillColor: '#FFFFFF',
        fillOpacity: 1,
      })
        .bindTooltip(st.name)
        .on('click', () => onSelectStop(stationToStop(st)))
        .addTo(layer);
    });
  }, [stations, onSelectStop]);

  // Rebuild nearby-stop markers when the stop list changes.
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

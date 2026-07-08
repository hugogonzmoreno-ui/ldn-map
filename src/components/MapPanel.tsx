import { useEffect, useMemo, useRef, useState } from 'react';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  Region,
  UrlTile,
} from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import { lineColor, modeColor } from '@/constants/lines';
import { collectStations, stationToStop } from '@/utils/network';
import type { LineRoute, Stop } from '@/types/tfl';

interface Props {
  region: Region;
  stops: Stop[];
  onSelectStop: (stop: Stop) => void;
  showsUser: boolean;
  /** Whole-network route geometry for the tube-map overlay. */
  routes?: LineRoute[];
}

// Station dots only appear once zoomed in enough to read them.
const STATION_ZOOM_DELTA = 0.09;

/**
 * Native map: Apple/Google base with a free OpenStreetMap raster tile overlay
 * (keyless), official-colour tube line polylines, zoom-gated station dots, and
 * a coloured dot per nearby stop. Metro loads this file on iOS/Android;
 * `MapPanel.web.tsx` is the Leaflet twin for web.
 */
export default function MapPanel({
  region,
  stops,
  onSelectStop,
  showsUser,
  routes = [],
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [zoomedIn, setZoomedIn] = useState(
    region.latitudeDelta <= STATION_ZOOM_DELTA
  );

  // Follow region changes (GPS resolving, searched stop) like the web twin.
  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.latitude, region.longitude]);

  const stations = useMemo(() => collectStations(routes), [routes]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={showsUser}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onRegionChangeComplete={(r) =>
          setZoomedIn(r.latitudeDelta <= STATION_ZOOM_DELTA)
        }
      >
        {/* Free OpenStreetMap raster tiles — no API key required. */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {/* The tube map, as it really runs: one polyline per branch. */}
        {routes.map((route) =>
          route.polylines.map((points, i) => (
            <Polyline
              key={`${route.lineId}-${i}`}
              coordinates={points}
              strokeColor={lineColor(route.lineId)}
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
            />
          ))
        )}

        {/* Station dots (zoom-gated; interchanges get the bigger ring). */}
        {zoomedIn &&
          stations.map((st) => {
            const interchange = st.lineIds.length > 1;
            return (
              <Marker
                key={st.id}
                coordinate={{ latitude: st.lat, longitude: st.lon }}
                title={st.name}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                onPress={() => onSelectStop(stationToStop(st))}
              >
                <View
                  style={[
                    styles.station,
                    interchange
                      ? styles.interchange
                      : { borderColor: lineColor(st.lineIds[0]) },
                  ]}
                />
              </Marker>
            );
          })}

        {/* Nearby stops (from the live nearby query) as coloured dots. */}
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lon }}
            title={stop.name}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            onPress={() => onSelectStop(stop)}
          >
            <View
              style={[
                styles.stopDot,
                { backgroundColor: modeColor(stop.primaryMode) },
              ]}
            />
          </Marker>
        ))}
      </MapView>
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  station: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
  },
  interchange: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 3,
    borderColor: '#111111',
  },
  stopDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  attribution: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    fontSize: 10,
    color: '#555',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
});

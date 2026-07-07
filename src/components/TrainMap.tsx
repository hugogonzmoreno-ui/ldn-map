import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  Polyline,
  UrlTile,
} from 'react-native-maps';
import { formatCountdown, stripStationSuffix } from '@/utils/format';
import type { LineRoute, TrainPosition } from '@/types/tfl';

interface Props {
  route: LineRoute | undefined;
  trains: TrainPosition[];
  color: string;
}

/** Region covering the whole route, with padding. */
function regionForRoute(route?: LineRoute) {
  const pts = route?.polylines.flat() ?? [];
  if (pts.length === 0) {
    return {
      latitude: 51.5074,
      longitude: -0.1278,
      latitudeDelta: 0.35,
      longitudeDelta: 0.35,
    };
  }
  const lats = pts.map((p) => p.latitude);
  const lons = pts.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.2),
    longitudeDelta: Math.max(0.02, (maxLon - minLon) * 1.2),
  };
}

/** Native live-train map. Web equivalent: TrainMap.web.tsx. */
export default function TrainMap({ route, trains, color }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const region = useMemo(() => regionForRoute(route), [route]);

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
  }, [region]);

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {(route?.polylines ?? []).map((line, i) => (
          <Polyline key={i} coordinates={line} strokeColor={color} strokeWidth={4} />
        ))}
        {trains.map((train) => (
          <Marker
            key={train.vehicleId}
            coordinate={{ latitude: train.lat, longitude: train.lon }}
            title={`→ ${train.towards}`}
            description={`${train.label} · ${formatCountdown(train.timeToNext)} to ${
              train.nextStopName
            }`}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={[styles.train, { backgroundColor: color }]} />
          </Marker>
        ))}
        {(route?.sequences ?? []).flatMap((seq) =>
          seq.stops.map((stop) => (
            <Marker
              key={`${seq.direction}-${stop.id}`}
              coordinate={{ latitude: stop.lat, longitude: stop.lon }}
              title={stripStationSuffix(stop.name)}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[styles.station, { borderColor: color }]} />
            </Marker>
          ))
        )}
      </MapView>
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  train: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  station: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#FFF',
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

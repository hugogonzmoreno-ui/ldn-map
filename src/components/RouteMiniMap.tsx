import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  Polyline,
  UrlTile,
} from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import { modeColor } from '@/constants/lines';
import type { JourneyLeg } from '@/types/tfl';

/** Bounding region covering every coordinate in the journey, with padding. */
function regionForLegs(legs: JourneyLeg[]) {
  const pts = legs.flatMap((l) => l.path);
  if (pts.length === 0) return null;
  const lats = pts.map((p) => p.latitude);
  const lons = pts.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.4),
    longitudeDelta: Math.max(0.01, (maxLon - minLon) * 1.4),
  };
}

/** Static overview map showing the journey route as coloured polylines. */
export default function RouteMiniMap({ legs }: { legs: JourneyLeg[] }) {
  const region = regionForLegs(legs);
  if (!region) return null;

  const start = legs.find((l) => l.path.length)?.path[0];
  const lastLeg = [...legs].reverse().find((l) => l.path.length);
  const end = lastLeg?.path[lastLeg.path.length - 1];

  return (
    <View style={styles.wrap}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {legs.map((leg, i) =>
          leg.path.length > 1 ? (
            <Polyline
              key={i}
              coordinates={leg.path}
              strokeColor={modeColor(leg.mode)}
              strokeWidth={leg.mode === 'walking' ? 3 : 5}
              lineDashPattern={leg.mode === 'walking' ? [4, 6] : undefined}
            />
          ) : null
        )}
        {start && <Marker coordinate={start} title="Start" pinColor="#0A7A0A" />}
        {end && <Marker coordinate={end} title="Destination" pinColor="#B00020" />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 200,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E9E9E9',
  },
});

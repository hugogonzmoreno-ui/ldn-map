import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  Polyline,
  UrlTile,
} from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import { modeColor } from '@/constants/lines';
import { regionForPoints } from '@/utils/geo';
import type { JourneyLeg } from '@/types/tfl';

/** Bounding region covering every coordinate in the journey, with padding. */
function regionForLegs(legs: JourneyLeg[]) {
  return regionForPoints(legs.flatMap((l) => l.path), 1.4, 0.01);
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
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
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

import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  Region,
  UrlTile,
} from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import { modeColor } from '@/constants/lines';
import type { Stop } from '@/types/tfl';

interface Props {
  region: Region;
  stops: Stop[];
  onSelectStop: (stop: Stop) => void;
  showsUser: boolean;
  // Accepted for parity with the web map (which shows a loading/error banner);
  // on native the map itself is always visible so these are unused.
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Native map: Apple/Google base with a free OpenStreetMap raster tile overlay
 * (keyless), plus a coloured marker per nearby stop. Metro loads this file on
 * iOS/Android; `MapPanel.web.tsx` provides a list fallback for web.
 */
export default function MapPanel({
  region,
  stops,
  onSelectStop,
  showsUser,
}: Props) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={showsUser}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Free OpenStreetMap raster tiles — no API key required. */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lon }}
            title={stop.name}
            pinColor={modeColor(stop.primaryMode)}
            onPress={() => onSelectStop(stop)}
          />
        ))}
      </MapView>
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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

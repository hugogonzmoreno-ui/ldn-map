import { useEffect, useRef } from 'react';
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
}

/**
 * Native map: Apple/Google base with a free OpenStreetMap raster tile overlay
 * (keyless), plus a coloured marker per nearby stop. Metro loads this file on
 * iOS/Android; `MapPanel.web.tsx` is the Leaflet twin for web.
 */
export default function MapPanel({
  region,
  stops,
  onSelectStop,
  showsUser,
}: Props) {
  const mapRef = useRef<MapView | null>(null);

  // Follow region changes (GPS resolving, searched stop) like the web twin.
  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.latitude, region.longitude]);

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

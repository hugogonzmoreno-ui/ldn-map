import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrivalsSheet from '@/components/ArrivalsSheet';
import MapPanel from '@/components/MapPanel';
import StopSearchInput from '@/components/StopSearchInput';
import { useNearbyStops } from '@/hooks/useTfl';
import type { Stop } from '@/types/tfl';

// Central London (Trafalgar Square) — fallback when location is unavailable.
const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };

export default function MapScreen() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selected, setSelected] = useState<Stop | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCoords({ lat: LONDON.latitude, lon: LONDON.longitude });
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch {
        setCoords({ lat: LONDON.latitude, lon: LONDON.longitude });
      }
    })();
  }, []);

  const { data: stops } = useNearbyStops(coords);

  const region = {
    latitude: coords?.lat ?? LONDON.latitude,
    longitude: coords?.lon ?? LONDON.longitude,
    ...DELTA,
  };

  const onSelectSearchStop = useCallback((stop: Stop) => {
    setQuery('');
    setSelected(stop);
  }, []);

  return (
    <View style={styles.container}>
      <MapPanel
        region={region}
        stops={stops ?? []}
        onSelectStop={setSelected}
        showsUser={!!coords}
      />

      <SafeAreaView style={styles.searchWrap} edges={['top']} pointerEvents="box-none">
        <View style={styles.searchInner}>
          <StopSearchInput
            placeholder="Search stops & stations"
            value={query}
            onChangeText={setQuery}
            onSelect={onSelectSearchStop}
            leftIcon="search"
          />
        </View>
      </SafeAreaView>

      {!coords && (
        <View style={styles.locating} pointerEvents="none">
          <Ionicons name="locate" size={16} color="#0057A8" />
          <Text style={styles.locatingText}>Finding your location…</Text>
        </View>
      )}

      <ArrivalsSheet stop={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E9E9E9' },
  searchWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  searchInner: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  locating: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  locatingText: { fontSize: 13, color: '#0057A8', fontWeight: '600' },
});

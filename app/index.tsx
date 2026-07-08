import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrivalsSheet from '@/components/ArrivalsSheet';
import MapPanel from '@/components/MapPanel';
import NearbySheet, { PEEK_HEIGHT } from '@/components/NearbySheet';
import StopSearchInput from '@/components/StopSearchInput';
import { useLineStatuses, useNearbyStops, useNetworkRoutes } from '@/hooks/useTfl';
import type { LineStatus, Stop } from '@/types/tfl';

// Central London (Trafalgar Square) — fallback when location is unavailable.
const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };

export default function HomeScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selected, setSelected] = useState<Stop | null>(null);
  const [query, setQuery] = useState('');
  const [showLines, setShowLines] = useState(true);

  const locate = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    } catch {
      // Keep whatever position we already have (London fallback at minimum).
    }
  }, []);

  useEffect(() => {
    // Show central London straight away so live data always loads, even if the
    // browser/device blocks or ignores the location prompt. We only *upgrade*
    // to the real position if geolocation succeeds.
    setCoords({ lat: LONDON.latitude, lon: LONDON.longitude });
    locate();
  }, [locate]);

  const { data: stops, isLoading, isError, refetch } = useNearbyStops(coords);
  const routes = useNetworkRoutes();
  const { data: statuses } = useLineStatuses();

  const disruptions = useMemo(
    () => (statuses ?? []).filter((s: LineStatus) => s.hasDisruption).length,
    [statuses]
  );

  const region = {
    latitude: coords?.lat ?? LONDON.latitude,
    longitude: coords?.lon ?? LONDON.longitude,
    ...DELTA,
  };

  const onSelectSearchStop = useCallback((stop: Stop) => {
    setQuery('');
    setSelected(stop);
    // Jump the map (and the nearby-stops query) to the searched stop. Search
    // matches missing coordinates are normalised to (0,0) — keep the current
    // view then. (Test both: London straddles longitude 0.)
    if (stop.lat !== 0 || stop.lon !== 0) {
      setCoords({ lat: stop.lat, lon: stop.lon });
    }
  }, []);

  return (
    <View style={styles.container}>
      <MapPanel
        region={region}
        stops={stops ?? []}
        onSelectStop={setSelected}
        showsUser={!!coords}
        routes={showLines ? routes : []}
      />

      <SafeAreaView style={styles.topWrap} edges={['top']} pointerEvents="box-none">
        <View style={styles.searchInner}>
          <StopSearchInput
            placeholder="Where to? Search stops & stations"
            value={query}
            onChangeText={setQuery}
            onSelect={onSelectSearchStop}
            leftIcon="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsScroll}
        >
          <Chip
            icon="navigate"
            label="Directions"
            onPress={() => router.push('/plan')}
          />
          <Chip
            icon="pulse"
            label="Status"
            badge={disruptions > 0 ? disruptions : undefined}
            onPress={() => router.push('/status')}
          />
          <Chip
            icon="train"
            label="Live trains"
            onPress={() => router.push('/trains')}
          />
          <Chip
            icon="git-branch"
            label="Lines"
            active={showLines}
            onPress={() => setShowLines((v) => !v)}
          />
        </ScrollView>
      </SafeAreaView>

      <Pressable
        style={[styles.locateFab, { bottom: PEEK_HEIGHT + 18 }]}
        onPress={locate}
        hitSlop={6}
      >
        <Ionicons name="locate" size={22} color="#0057A8" />
      </Pressable>

      <NearbySheet
        stops={stops ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onSelectStop={setSelected}
      />

      <ArrivalsSheet stop={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function Chip({
  icon,
  label,
  onPress,
  badge,
  active,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: number;
  active?: boolean;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon as never}
        size={15}
        color={active ? '#FFF' : '#0057A8'}
      />
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
      {badge !== undefined && (
        <View style={styles.chipBadge}>
          <Text style={styles.chipBadgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E9E9E9' },
  topWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  searchInner: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  chipsScroll: {
    marginTop: 10,
    flexGrow: 0,
  },
  chips: {
    paddingHorizontal: 14,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chipActive: {
    backgroundColor: '#0057A8',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  chipLabelActive: {
    color: '#FFF',
  },
  chipBadge: {
    backgroundColor: '#F3A000',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  locateFab: {
    position: 'absolute',
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});

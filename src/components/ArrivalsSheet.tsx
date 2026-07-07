import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrivalRow from './ArrivalRow';
import { useArrivals } from '@/hooks/useTfl';
import { modeColor, modeIcon } from '@/constants/lines';
import type { Stop } from '@/types/tfl';

interface Props {
  stop: Stop | null;
  onClose: () => void;
}

/**
 * Bottom sheet showing live arrivals for the selected stop. Implemented with a
 * plain Modal so the app needs no extra gesture/reanimated native dependencies.
 */
export default function ArrivalsSheet({ stop, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } =
    useArrivals(stop?.id ?? null);

  // Tick every 10s so countdowns visibly decrease between the 30s refetches.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!stop) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, [stop]);
  const elapsedSec = dataUpdatedAt ? Math.max(0, (now - dataUpdatedAt) / 1000) : 0;

  return (
    <Modal
      visible={!!stop}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <View
            style={[
              styles.icon,
              { backgroundColor: modeColor(stop?.primaryMode) },
            ]}
          >
            <Ionicons
              name={modeIcon(stop?.primaryMode) as never}
              size={18}
              color="#FFF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {stop?.name}
            </Text>
            <Text style={styles.subtitle}>
              {isFetching ? 'Updating…' : 'Live arrivals'}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close-circle" size={28} color="#C4C4C4" />
          </Pressable>
        </View>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
        {isError && (
          <View style={styles.center}>
            <Text style={styles.muted}>Couldn’t load arrivals.</Text>
            <Pressable onPress={() => refetch()}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        )}
        {!isLoading && !isError && (
          <FlatList
            data={data ?? []}
            keyExtractor={(a) => a.id}
            style={styles.list}
            renderItem={({ item }) => (
              <ArrivalRow
                arrival={{
                  ...item,
                  timeToStation: Math.max(0, item.timeToStation - elapsedSec),
                }}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.muted}>No arrivals predicted right now.</Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 8,
    maxHeight: '70%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DADADA',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 1,
  },
  list: {
    marginTop: 4,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  muted: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  retry: {
    color: '#0057A8',
    fontWeight: '600',
    fontSize: 15,
  },
});

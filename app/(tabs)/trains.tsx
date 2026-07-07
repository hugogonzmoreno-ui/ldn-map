import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import TrainMap from '@/components/TrainMap';
import { contrastText, lineColor, TRACKED_LINES } from '@/constants/lines';
import { useLineArrivals, useLineRoute } from '@/hooks/useTfl';
import { computeTrainPositions } from '@/utils/trains';

export default function TrainsScreen() {
  const params = useLocalSearchParams<{ line?: string }>();
  const [lineId, setLineId] = useState('victoria');

  // Allow deep-links like /trains?line=central (e.g. from the Status tab).
  useEffect(() => {
    if (params.line && TRACKED_LINES.some((l) => l.id === params.line)) {
      setLineId(params.line);
    }
  }, [params.line]);

  const color = lineColor(lineId);
  const { data: route, isLoading: routeLoading } = useLineRoute(lineId);
  const {
    data: predictions,
    isError,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useLineArrivals(lineId);

  const trains = useMemo(
    () => (route && predictions ? computeTrainPositions(predictions, route) : []),
    [route, predictions]
  );

  // "Updated Xs ago" ticker.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);
  const agoSec = dataUpdatedAt ? Math.max(0, Math.round((now - dataUpdatedAt) / 1000)) : null;

  return (
    <View style={styles.container}>
      <View style={styles.pickerWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.picker}
        >
          {TRACKED_LINES.map((line) => {
            const bg = lineColor(line.id);
            const active = line.id === lineId;
            return (
              <Pressable
                key={line.id}
                onPress={() => setLineId(line.id)}
                style={[
                  styles.chip,
                  { backgroundColor: bg },
                  active && styles.chipActive,
                ]}
              >
                <Text style={[styles.chipText, { color: contrastText(bg) }]}>
                  {line.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.statusRow}>
          {isError ? (
            <Pressable style={styles.statusInner} onPress={() => refetch()}>
              <Ionicons name="warning" size={14} color="#B00020" />
              <Text style={[styles.statusText, { color: '#B00020' }]}>
                Couldn’t reach TfL — tap to retry
              </Text>
            </Pressable>
          ) : (
            <View style={styles.statusInner}>
              <View style={[styles.liveDot, { backgroundColor: color }]} />
              <Text style={styles.statusText}>
                {trains.length} train{trains.length === 1 ? '' : 's'} live
                {agoSec != null && ` · updated ${isFetching ? 'now' : `${agoSec}s ago`}`}
              </Text>
              {routeLoading && <ActivityIndicator size="small" />}
            </View>
          )}
        </View>
      </View>

      <TrainMap route={route} trains={trains} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  pickerWrap: {
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E2E2',
  },
  picker: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    opacity: 0.55,
  },
  chipActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusRow: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  statusInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
});

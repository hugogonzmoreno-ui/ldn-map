import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import LegRow from '@/components/LegRow';
import RouteMiniMap from '@/components/RouteMiniMap';
import { getPlannedJourney } from '@/services/journeyStore';
import { formatDuration, formatTime } from '@/utils/format';

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const journey = getPlannedJourney(Number(id));

  if (!journey) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>
          This journey is no longer available. Please plan it again.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: formatDuration(journey.durationMins) }} />

      <View style={styles.summary}>
        <Text style={styles.duration}>{formatDuration(journey.durationMins)}</Text>
        <Text style={styles.times}>
          {formatTime(journey.startDateTime)} – {formatTime(journey.arrivalDateTime)}
          {'   ·   '}
          {journey.changes === 0
            ? 'Direct'
            : `${journey.changes} change${journey.changes > 1 ? 's' : ''}`}
        </Text>
      </View>

      <RouteMiniMap legs={journey.legs} />

      <View style={styles.legs}>
        {journey.legs.map((leg, i) => (
          <LegRow key={i} leg={leg} />
        ))}
        <View style={styles.arriveRow}>
          <View style={styles.arriveDot}>
            <Ionicons name="flag" size={14} color="#FFF" />
          </View>
          <Text style={styles.arriveText}>
            Arrive {formatTime(journey.arrivalDateTime)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  summary: {
    padding: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  duration: { fontSize: 26, fontWeight: '800', color: '#111' },
  times: { fontSize: 15, color: '#666', marginTop: 4 },
  legs: { paddingTop: 20 },
  arriveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  arriveDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    marginRight: 12,
  },
  arriveText: { fontSize: 15, fontWeight: '700', color: '#111' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  missingText: { textAlign: 'center', color: '#888', fontSize: 15 },
});

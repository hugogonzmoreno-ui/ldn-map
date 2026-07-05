import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LineBadge from './LineBadge';
import { formatDuration, formatTime } from '@/utils/format';
import type { Journey } from '@/types/tfl';

interface Props {
  journey: Journey;
  onPress: () => void;
}

/** Summary card for one route option: duration, times, line badges, changes. */
export default function JourneyOptionCard({ journey, onPress }: Props) {
  const transitLegs = journey.legs.filter((l) => l.mode !== 'walking');
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.duration}>{formatDuration(journey.durationMins)}</Text>
        <Text style={styles.times}>
          {formatTime(journey.startDateTime)} – {formatTime(journey.arrivalDateTime)}
        </Text>
      </View>

      <View style={styles.legsRow}>
        {journey.legs.map((leg, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <Ionicons name="chevron-forward" size={14} color="#9A9A9A" />
            )}
            {leg.mode === 'walking' ? (
              <View style={styles.walk}>
                <Ionicons name="walk" size={16} color="#4A4A4A" />
                <Text style={styles.walkText}>{leg.durationMins}m</Text>
              </View>
            ) : (
              <LineBadge
                lineId={leg.lineId}
                label={leg.lineName || leg.mode}
                mode={leg.mode}
                small
              />
            )}
          </Fragment>
        ))}
      </View>

      <Text style={styles.meta}>
        {journey.changes === 0
          ? 'Direct'
          : `${journey.changes} change${journey.changes > 1 ? 's' : ''}`}
        {transitLegs.length > 0 && ` · via ${transitLegs[0].lineName ?? transitLegs[0].mode}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  duration: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  times: {
    fontSize: 14,
    color: '#666',
  },
  legsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  walk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  walkText: {
    fontSize: 13,
    color: '#4A4A4A',
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    color: '#888',
  },
});

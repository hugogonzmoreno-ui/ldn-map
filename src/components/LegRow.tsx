import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import LineBadge from './LineBadge';
import { modeColor, modeIcon } from '@/constants/lines';
import { formatTime } from '@/utils/format';
import type { JourneyLeg } from '@/types/tfl';

/** A single step of a journey: walking segment or a ride on a line. */
export default function LegRow({ leg }: { leg: JourneyLeg }) {
  const isWalk = leg.mode === 'walking';
  const color = modeColor(leg.mode);
  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <Ionicons name={modeIcon(leg.mode) as never} size={14} color="#FFF" />
        </View>
        <View style={styles.line} />
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          {isWalk ? (
            <Text style={styles.walkTitle}>Walk</Text>
          ) : (
            <LineBadge
              lineId={leg.lineId}
              label={leg.lineName || leg.mode}
              mode={leg.mode}
              small
            />
          )}
          <Text style={styles.dur}>{leg.durationMins} min</Text>
        </View>

        <Text style={styles.summary}>{leg.summary}</Text>

        {!isWalk && !!leg.direction && (
          <Text style={styles.direction}>Towards {leg.direction}</Text>
        )}

        <View style={styles.stops}>
          {!!leg.fromName && (
            <Text style={styles.stop}>
              {formatTime(leg.departureTime)}  {leg.fromName}
            </Text>
          )}
          {!!leg.toName && (
            <Text style={styles.stop}>
              {formatTime(leg.arrivalTime)}  {leg.toName}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  timeline: {
    alignItems: 'center',
    width: 40,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#DADADA',
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingBottom: 20,
    paddingLeft: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  walkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  dur: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  summary: {
    fontSize: 15,
    color: '#111',
    marginBottom: 4,
  },
  direction: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  stops: {
    marginTop: 2,
    gap: 2,
  },
  stop: {
    fontSize: 13,
    color: '#888',
  },
});

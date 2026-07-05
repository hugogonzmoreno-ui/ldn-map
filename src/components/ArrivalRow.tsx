import { StyleSheet, Text, View } from 'react-native';
import LineBadge from './LineBadge';
import { formatCountdown } from '@/utils/format';
import type { Arrival } from '@/types/tfl';

/** One live arrival: line badge, destination + platform, and a countdown. */
export default function ArrivalRow({ arrival }: { arrival: Arrival }) {
  const countdown = formatCountdown(arrival.timeToStation);
  const isDue = countdown === 'Due';
  return (
    <View style={styles.row}>
      <View style={styles.badgeCol}>
        <LineBadge
          lineId={arrival.lineId}
          label={arrival.lineName || arrival.modeName}
          mode={arrival.modeName}
          small
        />
      </View>
      <View style={styles.middle}>
        <Text style={styles.dest} numberOfLines={1}>
          {arrival.destinationName}
        </Text>
        {!!arrival.platformName && (
          <Text style={styles.platform} numberOfLines={1}>
            {arrival.platformName}
          </Text>
        )}
      </View>
      <Text style={[styles.countdown, isDue && styles.due]}>{countdown}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E2E2',
    gap: 12,
  },
  badgeCol: {
    minWidth: 62,
  },
  middle: {
    flex: 1,
  },
  dest: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  platform: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  countdown: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    minWidth: 52,
    textAlign: 'right',
  },
  due: {
    color: '#008A00',
  },
});

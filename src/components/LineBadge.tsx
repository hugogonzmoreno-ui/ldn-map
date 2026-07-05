import { StyleSheet, Text, View } from 'react-native';
import { contrastText, lineColor } from '@/constants/lines';
import type { TflMode } from '@/types/tfl';

interface Props {
  lineId?: string;
  label: string;
  mode?: TflMode;
  small?: boolean;
}

/** A rounded pill in the line's official colour, e.g. the red "205" bus badge. */
export default function LineBadge({ lineId, label, mode, small }: Props) {
  const bg = lineColor(lineId, mode);
  const color = contrastText(bg);
  return (
    <View
      style={[styles.badge, small && styles.badgeSmall, { backgroundColor: bg }]}
    >
      <Text
        style={[styles.text, small && styles.textSmall, { color }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 12,
  },
});

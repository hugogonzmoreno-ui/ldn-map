import { StyleSheet, Text, View } from 'react-native';

interface Props {
  description: string;
  hasDisruption: boolean;
}

/** Colour-coded pill: green for Good Service, amber/red for disruptions. */
export default function StatusChip({ description, hasDisruption }: Props) {
  const bg = !hasDisruption
    ? '#E4F5E4'
    : /suspend|closed|severe|part/i.test(description)
    ? '#FBE0DF'
    : '#FCEFD6';
  const fg = !hasDisruption
    ? '#0A7A0A'
    : /suspend|closed|severe|part/i.test(description)
    ? '#B00020'
    : '#9A6A00';
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

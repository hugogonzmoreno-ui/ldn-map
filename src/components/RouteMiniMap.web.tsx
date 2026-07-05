import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { JourneyLeg } from '@/types/tfl';

/** Web fallback: the interactive route map is shown on device. */
export default function RouteMiniMap(_props: { legs: JourneyLeg[] }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="map-outline" size={28} color="#9AA6B2" />
      <Text style={styles.text}>Route map available on the mobile app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 120,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#EEF1F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: { color: '#8A97A4', fontSize: 14 },
});

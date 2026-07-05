import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { modeColor, modeIcon } from '@/constants/lines';
import type { Stop } from '@/types/tfl';

interface Props {
  region: { latitude: number; longitude: number };
  stops: Stop[];
  onSelectStop: (stop: Stop) => void;
  showsUser: boolean;
}

/**
 * Web fallback: react-native-maps has no reliable web renderer, so on web we
 * present nearby stops as a tappable list. Full map is available on device.
 */
export default function MapPanel({ stops, onSelectStop }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Ionicons name="phone-portrait-outline" size={18} color="#0057A8" />
        <Text style={styles.bannerText}>
          Interactive map runs on the iOS/Android app. Here are nearby stops:
        </Text>
      </View>
      <FlatList
        data={stops}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onSelectStop(item)}>
            <View
              style={[styles.icon, { backgroundColor: modeColor(item.primaryMode) }]}
            >
              <Ionicons name={modeIcon(item.primaryMode) as never} size={16} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.distance != null && (
                <Text style={styles.dist}>{Math.round(item.distance)} m away</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C0C0C0" />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Searching for nearby stops…</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF2FB',
    padding: 12,
  },
  bannerText: { flex: 1, fontSize: 13, color: '#0057A8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  dist: { fontSize: 13, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
});

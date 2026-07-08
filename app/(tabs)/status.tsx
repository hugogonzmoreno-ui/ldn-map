import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LineBadge from '@/components/LineBadge';
import StatusChip from '@/components/StatusChip';
import { TRACKED_LINES } from '@/constants/lines';
import { useLineStatuses } from '@/hooks/useTfl';
import { prettyMode } from '@/utils/format';
import type { LineStatus } from '@/types/tfl';

const MODE_ORDER = ['tube', 'elizabeth-line', 'overground', 'dlr', 'tram'];

export default function StatusScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useLineStatuses();
  const [expanded, setExpanded] = useState<string | null>(null);

  const sections = useMemo(() => {
    const byMode = new Map<string, LineStatus[]>();
    (data ?? []).forEach((line: LineStatus) => {
      const list = byMode.get(line.modeName) ?? [];
      list.push(line);
      byMode.set(line.modeName, list);
    });
    return MODE_ORDER.filter((m) => byMode.has(m)).map((m) => ({
      title: prettyMode(m),
      data: byMode.get(m)!,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Couldn’t load line status.</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() =>
            item.reason && setExpanded(expanded === item.id ? null : item.id)
          }
        >
          <View style={styles.rowTop}>
            <LineBadge lineId={item.id} label={item.name} mode={item.modeName} />
            <View style={styles.rowRight}>
              <StatusChip
                description={item.statusDescription}
                hasDisruption={item.hasDisruption}
              />
              {TRACKED_LINES.some((l) => l.id === item.id) && (
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push(`/(tabs)/trains?line=${item.id}`)}
                >
                  <Ionicons name="map-outline" size={20} color="#0057A8" />
                </Pressable>
              )}
            </View>
          </View>
          {item.reason && expanded === item.id && (
            <Text style={styles.reason}>{item.reason}</Text>
          )}
        </Pressable>
      )}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListFooterComponent={
        <Text style={styles.footer}>
          Hop London v{Constants.expoConfig?.version ?? '?'} · Powered by TfL Open
          Data
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reason: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  muted: { color: '#888', fontSize: 15 },
  retry: { color: '#0057A8', fontWeight: '600', fontSize: 15 },
  footer: {
    textAlign: 'center',
    color: '#B0B0B0',
    fontSize: 12,
    paddingTop: 16,
  },
});

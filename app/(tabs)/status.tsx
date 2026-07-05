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
import { useLineStatuses } from '@/hooks/useTfl';
import { prettyMode } from '@/utils/format';
import type { LineStatus } from '@/types/tfl';

const MODE_ORDER = ['tube', 'elizabeth-line', 'overground', 'dlr', 'tram'];

export default function StatusScreen() {
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
            <StatusChip
              description={item.statusDescription}
              hasDisruption={item.hasDisruption}
            />
          </View>
          {item.reason && expanded === item.id && (
            <Text style={styles.reason}>{item.reason}</Text>
          )}
        </Pressable>
      )}
      contentContainerStyle={{ paddingBottom: 32 }}
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
  reason: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  muted: { color: '#888', fontSize: 15 },
  retry: { color: '#0057A8', fontWeight: '600', fontSize: 15 },
});

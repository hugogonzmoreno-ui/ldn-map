import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modeColor, modeIcon } from '@/constants/lines';
import { prettyMode, stripStationSuffix } from '@/utils/format';
import type { Stop } from '@/types/tfl';

interface Props {
  stops: Stop[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectStop: (stop: Stop) => void;
}

/** Height of the collapsed "peek" state (grabber + header). */
export const PEEK_HEIGHT = 132;

/**
 * Persistent draggable bottom sheet listing nearby stations, Citymapper-style.
 * Two snap points (peek / expanded), driven by core Animated + PanResponder so
 * it works identically on iOS, Android, and react-native-web with no extra
 * native dependencies.
 */
export default function NearbySheet({
  stops,
  isLoading,
  isError,
  onRetry,
  onSelectStop,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const expandedHeight = Math.min(windowHeight * 0.55, 520);
  const collapsedOffset = expandedHeight - PEEK_HEIGHT;

  const [expanded, setExpanded] = useState(false);
  // 0 = expanded, collapsedOffset = peek.
  const translateY = useRef(new Animated.Value(collapsedOffset)).current;
  const restOffset = useRef(collapsedOffset);

  const snapTo = (offset: number) => {
    restOffset.current = offset;
    setExpanded(offset === 0);
    Animated.spring(translateY, {
      toValue: offset,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
      mass: 0.7,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        const next = Math.min(
          Math.max(restOffset.current + g.dy, 0),
          collapsedOffset
        );
        translateY.setValue(next);
      },
      onPanResponderRelease: (_e, g) => {
        const at = restOffset.current + g.dy;
        // Fling wins; otherwise snap to the nearest point.
        const goExpanded =
          g.vy < -0.4 || (g.vy <= 0.4 && at < collapsedOffset / 2);
        snapTo(goExpanded ? 0 : collapsedOffset);
      },
    })
  ).current;

  const sorted = useMemo(
    () => [...stops].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)),
    [stops]
  );

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: expandedHeight + insets.bottom,
          paddingBottom: insets.bottom,
          transform: [{ translateY }],
        },
      ]}
    >
      <View {...pan.panHandlers}>
        <Pressable
          onPress={() => snapTo(expanded ? collapsedOffset : 0)}
          style={styles.headerArea}
        >
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Nearby stations</Text>
            {isLoading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.count}>{sorted.length}</Text>
            )}
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={20}
              color="#9A9A9A"
            />
          </View>
          <Text style={styles.hint}>
            {isError
              ? 'Couldn’t reach TfL — tap a station to retry, or pull up.'
              : 'Tap a station for live departures'}
          </Text>
        </Pressable>
      </View>

      {isError ? (
        <Pressable style={styles.errorBox} onPress={onRetry}>
          <Ionicons name="warning" size={16} color="#B00020" />
          <Text style={styles.errorText}>Couldn’t reach TfL — tap to retry</Text>
        </Pressable>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(s) => s.id}
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onSelectStop(item)}>
              <View
                style={[
                  styles.rowIcon,
                  { backgroundColor: modeColor(item.primaryMode) },
                ]}
              >
                <Ionicons
                  name={modeIcon(item.primaryMode) as never}
                  size={16}
                  color="#FFF"
                />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {stripStationSuffix(item.name)}
                </Text>
                <Text style={styles.rowModes} numberOfLines={1}>
                  {item.modes.map(prettyMode).join(' · ')}
                </Text>
              </View>
              {typeof item.distance === 'number' && (
                <Text style={styles.rowDistance}>
                  {Math.round(item.distance)} m
                </Text>
              )}
              <Ionicons name="chevron-forward" size={16} color="#C4C4C4" />
            </Pressable>
          )}
          ListEmptyComponent={
            isLoading ? null : (
              <Text style={styles.empty}>No stations found nearby.</Text>
            )
          }
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  headerArea: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DADADA',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    flex: 1,
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0057A8',
    backgroundColor: '#E8F1FA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  hint: {
    fontSize: 12,
    color: '#9A9A9A',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE',
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#151515',
  },
  rowModes: {
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 1,
  },
  rowDistance: {
    fontSize: 12,
    color: '#8A8A8A',
    fontVariant: ['tabular-nums'],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  errorText: { color: '#B00020', fontSize: 13, fontWeight: '600' },
  empty: {
    textAlign: 'center',
    color: '#8A8A8A',
    fontSize: 13,
    paddingVertical: 24,
  },
});

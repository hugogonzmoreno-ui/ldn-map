import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStopSearch } from '@/hooks/useTfl';
import { modeColor } from '@/constants/lines';
import type { Stop } from '@/types/tfl';

interface Props {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  onSelect: (stop: Stop) => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onUseLocation?: () => void;
}

/** Text input with live TfL stop suggestions dropdown. */
export default function StopSearchInput({
  placeholder,
  value,
  onChangeText,
  onSelect,
  leftIcon = 'location-outline',
  onUseLocation,
}: Props) {
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    []
  );
  const { data, isFetching } = useStopSearch(value);
  const showResults = focused && value.trim().length >= 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <Ionicons name={leftIcon} size={18} color="#888" />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay so a tap on a suggestion (onPressIn) lands first.
            blurTimer.current = setTimeout(() => setFocused(false), 250);
          }}
          autoCorrect={false}
        />
        {isFetching && showResults && <ActivityIndicator size="small" />}
        {!!onUseLocation && (
          <Pressable onPress={onUseLocation} hitSlop={8}>
            <Ionicons name="navigate-circle" size={22} color="#0057A8" />
          </Pressable>
        )}
      </View>

      {showResults && (data?.length ?? 0) > 0 && (
        <View style={styles.results}>
          <FlatList
            data={data}
            keyExtractor={(s) => s.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220 }}
            renderItem={({ item }) => (
              // onPressIn: fire before the TextInput's blur can hide the list.
              <Pressable style={styles.result} onPressIn={() => onSelect(item)}>
                <Ionicons
                  name="location"
                  size={16}
                  color={modeColor(item.primaryMode)}
                />
                <Text style={styles.resultText} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F1F3',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111',
  },
  results: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  resultText: {
    fontSize: 15,
    color: '#222',
    flex: 1,
  },
});

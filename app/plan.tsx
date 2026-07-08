import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import JourneyOptionCard from '@/components/JourneyOptionCard';
import StopSearchInput from '@/components/StopSearchInput';
import { useJourney } from '@/hooks/useTfl';
import { setPlannedJourneys } from '@/services/journeyStore';
import type { Stop } from '@/types/tfl';

interface Endpoint {
  label: string;
  value: string; // stop id or "lat,lon"
}

export default function PlanScreen() {
  const router = useRouter();
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [from, setFrom] = useState<Endpoint | null>(null);
  const [to, setTo] = useState<Endpoint | null>(null);
  const [submitted, setSubmitted] = useState<{ from: string; to: string } | null>(
    null
  );

  const { data, isLoading, isError, error } = useJourney(
    submitted?.from ?? null,
    submitted?.to ?? null
  );

  const useMyLocation = async (which: 'from' | 'to') => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    const value = `${pos.coords.latitude},${pos.coords.longitude}`;
    if (which === 'from') {
      setFrom({ label: 'My location', value });
      setFromText('My location');
    } else {
      setTo({ label: 'My location', value });
      setToText('My location');
    }
  };

  const pick = (which: 'from' | 'to') => (stop: Stop) => {
    const endpoint = { label: stop.name, value: stop.id };
    if (which === 'from') {
      setFrom(endpoint);
      setFromText(stop.name);
    } else {
      setTo(endpoint);
      setToText(stop.name);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setFromText(toText);
    setToText(fromText);
  };

  const search = () => {
    if (from && to) setSubmitted({ from: from.value, to: to.value });
  };

  const openJourney = (index: number) => {
    if (!data) return;
    setPlannedJourneys(data);
    router.push(`/journey/${index}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputs}>
        <View style={styles.inputsCol}>
          <StopSearchInput
            placeholder="From"
            value={fromText}
            onChangeText={(t) => {
              setFromText(t);
              setFrom(null);
            }}
            onSelect={pick('from')}
            leftIcon="radio-button-on"
            onUseLocation={() => useMyLocation('from')}
          />
          <View style={{ height: 10 }} />
          <StopSearchInput
            placeholder="To"
            value={toText}
            onChangeText={(t) => {
              setToText(t);
              setTo(null);
            }}
            onSelect={pick('to')}
            leftIcon="location"
            onUseLocation={() => useMyLocation('to')}
          />
        </View>
        <Pressable style={styles.swap} onPress={swap} hitSlop={8}>
          <Ionicons name="swap-vertical" size={20} color="#0057A8" />
        </Pressable>
      </View>

      <Pressable
        style={[styles.cta, !(from && to) && styles.ctaDisabled]}
        onPress={search}
        disabled={!(from && to)}
      >
        <Ionicons name="navigate" size={18} color="#FFF" />
        <Text style={styles.ctaText}>Find routes</Text>
      </Pressable>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}
      {isError && (
        <Text style={styles.error}>
          {(error as Error)?.message ?? 'Something went wrong.'}
        </Text>
      )}
      {!isLoading && data && (
        <FlatList
          data={data}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <JourneyOptionCard journey={item} onPress={() => openJourney(index)} />
          )}
          ListHeaderComponent={
            <Text style={styles.resultsHeader}>
              {data.length} route{data.length === 1 ? '' : 's'} found
            </Text>
          }
          ListEmptyComponent={<Text style={styles.error}>No routes found.</Text>}
        />
      )}
      {!submitted && !isLoading && (
        <View style={styles.hint}>
          <Ionicons name="git-compare-outline" size={40} color="#CFCFCF" />
          <Text style={styles.hintText}>
            Enter where you’re going to compare live routes across Tube, bus,
            rail and more.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F5' },
  inputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#FFF',
  },
  inputsCol: { flex: 1 },
  swap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FB',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0057A8',
    marginHorizontal: 14,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaDisabled: { backgroundColor: '#B7C7D8' },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  center: { paddingVertical: 40, alignItems: 'center' },
  error: { textAlign: 'center', color: '#B00020', padding: 24 },
  resultsHeader: {
    fontSize: 13,
    color: '#888',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 8,
  },
  hint: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 12,
  },
  hintText: { textAlign: 'center', color: '#999', fontSize: 15, lineHeight: 21 },
});

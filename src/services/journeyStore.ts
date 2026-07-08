// Hand-off for the currently planned journeys, so the journey detail route can
// read the selected option by index without serialising the whole object
// through navigation params. In-memory first; mirrored to sessionStorage on
// web so a page refresh or shared /journey/N link still resolves.

import type { Journey } from '@/types/tfl';

const STORAGE_KEY = 'hoplondon.plannedJourneys';

let plannedJourneys: Journey[] = [];

function storage(): Storage | null {
  try {
    // Absent on native; can also throw on web in private/locked-down modes.
    return (globalThis as { sessionStorage?: Storage }).sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function setPlannedJourneys(journeys: Journey[]): void {
  plannedJourneys = journeys;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(journeys));
  } catch {
    // Quota/serialisation problems just lose the refresh nicety.
  }
}

export function getPlannedJourney(index: number): Journey | undefined {
  if (plannedJourneys[index]) return plannedJourneys[index];
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Journey[];
    if (Array.isArray(parsed)) {
      plannedJourneys = parsed;
      return parsed[index];
    }
  } catch {
    // Corrupt entry — fall through.
  }
  return undefined;
}

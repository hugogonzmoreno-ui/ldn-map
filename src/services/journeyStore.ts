// Tiny in-memory hand-off for the currently planned journeys, so the journey
// detail route can read the selected option by index without serialising the
// whole object through navigation params.

import type { Journey } from '@/types/tfl';

let plannedJourneys: Journey[] = [];

export function setPlannedJourneys(journeys: Journey[]): void {
  plannedJourneys = journeys;
}

export function getPlannedJourney(index: number): Journey | undefined {
  return plannedJourneys[index];
}

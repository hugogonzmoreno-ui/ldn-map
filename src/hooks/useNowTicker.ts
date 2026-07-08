import { useEffect, useState } from 'react';

/**
 * Current time, refreshed every `intervalMs` while `active` — used to age
 * live countdowns ("3 min", "updated 12s ago") between data refetches.
 */
export function useNowTicker(intervalMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, active]);
  return now;
}

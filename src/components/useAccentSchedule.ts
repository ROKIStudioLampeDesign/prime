import { useSyncExternalStore } from 'react';
import { accentSlot, accentSlotProgress, nextAccentChange } from '../domain/accentRotation';
import { accentBoost, accentForSlot, subscribeAccentBoost } from '../lib/accent';
import { useNow } from './useNow';

/**
 * The current and next colours, and how far the current slot is, on the rotation's own
 * clock (the real one plus the time skipped by tapping the letter). Refreshed every second.
 */
export function useAccentSchedule() {
  const boost = useSyncExternalStore(subscribeAccentBoost, accentBoost);
  const now = useNow(1000) + boost;
  const slot = accentSlot(now);
  return {
    current: accentForSlot(slot),
    next: accentForSlot(slot + 1),
    progress: accentSlotProgress(now),
    msLeft: nextAccentChange(now) - now,
  };
}

import { useSyncExternalStore } from 'react';
import { accentSlot, accentSlotProgress, nextAccentChange } from '../domain/accentRotation';
import { accentForSlot, accentSkips, subscribeAccentSkips } from '../lib/accent';
import { useNow } from './useNow';

/** How many times "Changer maintenant" moved the rotation forward since the app was loaded. */
export const useAccentSkips = () => useSyncExternalStore(subscribeAccentSkips, accentSkips);

/** The current and next colours, and how far the current half hour is. Refreshed every 15 s. */
export function useAccentSchedule() {
  const now = useNow(15_000);
  const slot = accentSlot(now) + useAccentSkips();
  return {
    current: accentForSlot(slot),
    next: accentForSlot(slot + 1),
    progress: accentSlotProgress(now),
    msLeft: nextAccentChange(now) - now,
  };
}

import { useEffect } from 'react';

/**
 * Keeps the screen awake while `enabled` (Screen Wake Lock API, iOS 16.4+). The browser releases
 * the lock when the page is hidden, so it is re-acquired whenever the page becomes visible again.
 * Silently does nothing where unsupported.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | undefined;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        // Denied (e.g. low battery mode): the workout still works, the screen may just sleep.
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release();
    };
  }, [enabled]);
}

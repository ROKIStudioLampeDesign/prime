import { useEffect, useState } from 'react';

/**
 * Current time, refreshed every `intervalMs` while `enabled`, and immediately when the app
 * comes back to the foreground. Use it only to re-render: durations must be computed from
 * stored timestamps, never by counting ticks (timers are throttled while the phone is locked).
 */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, enabled]);
  return now;
}

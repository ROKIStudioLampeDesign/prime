/** Calls `onVisible` each time the page comes back to the foreground; returns the unsubscribe. */
export function onForeground(onVisible: () => void): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const listener = () => {
    if (document.visibilityState === 'visible') onVisible();
  };
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

/**
 * Asks the service worker registration to look for a new version every `intervalMs` and each time
 * the app comes back to the foreground: an installed iPhone app is usually resumed from the
 * background rather than relaunched, and its timers don't run while it is hidden. Checks are
 * skipped while offline, and a failed check (network drop mid-request) is swallowed: it is
 * retried later and must not surface as an unhandled rejection.
 */
export function startUpdateChecks(
  registration: { update: () => Promise<unknown> },
  intervalMs: number,
  isOnline: () => boolean = () => navigator.onLine,
  subscribeForeground: (onVisible: () => void) => () => void = onForeground,
): () => void {
  const check = () => {
    if (!isOnline()) return;
    registration.update().catch(() => undefined);
  };
  const timer = setInterval(check, intervalMs);
  const unsubscribe = subscribeForeground(check);
  return () => {
    clearInterval(timer);
    unsubscribe();
  };
}

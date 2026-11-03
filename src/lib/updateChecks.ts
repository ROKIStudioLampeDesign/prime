/**
 * Periodically asks the service worker registration to look for a new version. Checks are
 * skipped while offline, and a failed check (network drop mid-request) is swallowed: it is
 * retried on the next tick and must not surface as an unhandled rejection.
 */
export function startUpdateChecks(
  registration: { update: () => Promise<unknown> },
  intervalMs: number,
  isOnline: () => boolean = () => navigator.onLine,
): () => void {
  const timer = setInterval(() => {
    if (!isOnline()) return;
    registration.update().catch(() => undefined);
  }, intervalMs);
  return () => clearInterval(timer);
}

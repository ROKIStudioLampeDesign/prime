import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { startUpdateChecks } from '../lib/updateChecks';

/** Checks for a new version every hour while the app stays open (installed PWAs rarely reload). */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * "Nouvelle version disponible" toast. The service worker waits until the user accepts, so an
 * update never reloads the app in the middle of a workout.
 */
export function UpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      setRegistration(registration);
    },
  });

  useEffect(
    () => (registration ? startUpdateChecks(registration, UPDATE_CHECK_MS) : undefined),
    [registration],
  );

  if (!needRefresh) return null;
  // z-40: below a sheet's backdrop (z-50). An open sheet makes the page inert, this toast included,
  // so drawing it on top would let a tap fall through to the backdrop and close the sheet.
  return (
    // A yellow band across the top, over the header.
    <div role="alert" className="fixed inset-x-0 top-0 z-40 bg-accent-fill pt-safe px-safe text-ink">
      <div className="mx-auto flex min-h-16 max-w-lg items-center gap-2 py-2">
        <p className="flex-1 text-[15px] font-extrabold">Nouvelle version disponible</p>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-11 px-3 text-sm font-bold focus-inset active:bg-ink/10"
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={() => {
            // workbox-window doesn't reload for updates found after page load (it treats them as
            // "external"), which is how real updates arrive: reload once the new worker takes over.
            navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
              once: true,
            });
            void updateServiceWorker(true);
          }}
          className="min-h-11 bg-ink px-4 text-sm font-black text-on-ink focus-inset active:opacity-80"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}

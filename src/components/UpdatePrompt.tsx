import { useRegisterSW } from 'virtual:pwa-register/react';

/** Checks for a new version every hour while the app stays open (installed PWAs rarely reload). */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * "Nouvelle version disponible" toast. The service worker waits until the user accepts, so an
 * update never reloads the app in the middle of a workout.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_MS);
    },
  });

  if (!needRefresh) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-60 px-safe">
      <div className="mx-auto flex max-w-lg items-center gap-2 rounded-2xl bg-surface-2 py-2 pr-2 pl-4 shadow-lg shadow-black/40">
        <p className="flex-1 text-sm font-semibold">Nouvelle version disponible</p>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-11 rounded-xl px-3 text-sm text-muted active:bg-surface"
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
          className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg active:opacity-80"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}

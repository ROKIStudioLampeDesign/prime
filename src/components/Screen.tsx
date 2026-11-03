import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BackIcon, SettingsIcon } from './icons';
import { useGoBack } from './useGoBack';

interface ScreenProps {
  title: string;
  /** Show a back button instead of the settings gear (for pushed screens). */
  back?: boolean;
  /** Where the back button goes when there is no in-app history (app opened on this page). */
  backFallback?: string;
  /** Overrides the back button behaviour (e.g. closing an in-page step). */
  onBack?: () => void;
  /** Extra header buttons, shown before the gear. */
  actions?: ReactNode;
  children: ReactNode;
}

export const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2 active:text-fg';

export function Screen({ title, back = false, backFallback = '/', onBack, actions, children }: ScreenProps) {
  const goBack = useGoBack(backFallback);

  return (
    <>
      <header className="sticky top-0 z-10 bg-bg/90 pt-safe px-safe backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-1">
          {back && (
            <button
              type="button"
              aria-label="Retour"
              className={iconButton + ' -ml-3'}
              onClick={onBack ?? goBack}
            >
              <BackIcon />
            </button>
          )}
          <h1 className="flex-1 truncate font-display text-3xl font-bold">{title}</h1>
          {actions}
          {!back && (
            <Link to="/settings" aria-label="Réglages" className={iconButton + ' -mr-3'}>
              <SettingsIcon />
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-safe pb-6">{children}</main>
    </>
  );
}

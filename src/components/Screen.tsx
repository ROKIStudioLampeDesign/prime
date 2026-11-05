import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BackIcon, SettingsIcon } from './icons';
import { useGoBack } from './useGoBack';

interface ScreenProps {
  title: string;
  /** A short line above the title (e.g. today's date). */
  subtitle?: string;
  /** Show a back button instead of the settings gear (for pushed screens). */
  back?: boolean;
  /** Where the back button goes when there is no in-app history (app opened on this page). */
  backFallback?: string;
  /** Overrides the back button behaviour (e.g. closing an in-page step). */
  onBack?: () => void;
  /** Extra header buttons, shown before the gear. */
  actions?: ReactNode;
  /** Content stretches to the tab bar (its last child can grow with `flex-1`), no bottom gap. */
  fill?: boolean;
  children: ReactNode;
}

export const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2 active:text-fg';

/**
 * Header buttons (back, settings) and in-page arrows (previous / next day): a filled circle, so
 * they read as buttons next to the big type.
 */
export const headerButton =
  'flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-fg active:bg-surface-2';

export function Screen({
  title,
  subtitle,
  back = false,
  backFallback = '/',
  onBack,
  actions,
  fill = false,
  children,
}: ScreenProps) {
  const goBack = useGoBack(backFallback);

  return (
    <>
      <header className="sticky top-0 z-10 bg-bg pt-safe px-safe">
        <div
          className={`mx-auto flex min-h-18 max-w-lg gap-3 py-2 ${subtitle ? 'items-end pb-3' : 'items-center'}`}
        >
          {back && (
            <button type="button" aria-label="Retour" className={headerButton} onClick={onBack ?? goBack}>
              <BackIcon />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {subtitle && (
              <p className="truncate text-[15px] font-semibold text-muted first-letter:uppercase">
                {subtitle}
              </p>
            )}
            {/* Pushed screens share the row with a back button (and often actions): smaller, two lines. */}
            <h1
              className={
                back
                  ? 'line-clamp-2 text-[2rem] leading-[1.05] headline'
                  : 'truncate text-[2.5rem] leading-none headline'
              }
            >
              {title}
            </h1>
          </div>
          {actions}
          {!back && (
            <Link to="/settings" aria-label="Réglages" className={headerButton}>
              <SettingsIcon />
            </Link>
          )}
        </div>
      </header>
      <main className={`mx-auto w-full max-w-lg px-safe ${fill ? 'flex flex-1 flex-col' : 'pb-6'}`}>
        {children}
      </main>
    </>
  );
}

import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { BackIcon, SettingsIcon } from './icons';

interface ScreenProps {
  title: string;
  /** Show a back button instead of the settings gear (for pushed screens). */
  back?: boolean;
  children: ReactNode;
}

const iconButton =
  'flex size-11 items-center justify-center rounded-full text-muted active:bg-surface-2 active:text-fg';

export function Screen({ title, back = false, children }: ScreenProps) {
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-10 bg-bg/90 pt-safe px-safe backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-1">
          {back && (
            <button
              type="button"
              aria-label="Retour"
              className={iconButton + ' -ml-3'}
              onClick={() => navigate(-1)}
            >
              <BackIcon />
            </button>
          )}
          <h1 className="flex-1 truncate text-2xl font-bold tracking-tight">{title}</h1>
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

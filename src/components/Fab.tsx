import { Link } from 'react-router';
import { PlusIcon } from './icons';

/** Floating action button, bottom-right above the tab bar. */
export function Fab({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1rem)] z-20 flex size-14 items-center justify-center rounded-full bg-accent-fill text-accent-fg float-shadow active:scale-95"
    >
      <PlusIcon className="size-7" strokeWidth={2.2} />
    </Link>
  );
}

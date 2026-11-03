import { NavLink } from 'react-router';

export interface SubTab {
  to: string;
  label: string;
  /** Match the path exactly (for the section's index tab). */
  end?: boolean;
}

/** Segmented links at the top of a section (e.g. Journal / Produits / Plats). */
export function SubTabs({ label, tabs }: { label: string; tabs: readonly SubTab[] }) {
  return (
    <nav
      aria-label={label}
      className="mb-4 grid gap-1 rounded-full bg-surface p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          replace
          className={({ isActive }) =>
            `flex min-h-11 items-center justify-center truncate rounded-full px-1 text-sm font-semibold ${
              isActive ? 'bg-accent-fill text-accent-fg' : 'text-muted'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

import { NavLink } from 'react-router';

export interface SubTab {
  to: string;
  label: string;
  /** Match the path exactly (for the section's index tab). */
  end?: boolean;
}

/** Underlined links at the top of a section (e.g. Journal / Produits / Plats). */
export function SubTabs({ label, tabs }: { label: string; tabs: readonly SubTab[] }) {
  return (
    <nav aria-label={label} className="mb-4 flex gap-5 border-b border-line">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          replace
          className={({ isActive }) =>
            `relative flex min-h-11 items-center text-[15px] ${isActive ? 'font-extrabold text-fg' : 'font-bold text-muted'}`
          }
        >
          {({ isActive }) => (
            <>
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-1 bg-indicator" aria-hidden="true" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

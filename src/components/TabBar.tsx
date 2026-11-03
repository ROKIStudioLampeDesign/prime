import { NavLink } from 'react-router';
import type { ComponentType, SVGProps } from 'react';
import { BodyIcon, GymIcon, NutritionIcon, StatsIcon, TodayIcon } from './icons';

interface Tab {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const TABS: Tab[] = [
  { to: '/', label: "Aujourd'hui", icon: TodayIcon },
  { to: '/nutrition', label: 'Alimentation', icon: NutritionIcon },
  { to: '/gym', label: 'Salle', icon: GymIcon },
  { to: '/body', label: 'Corps', icon: BodyIcon },
  { to: '/stats', label: 'Stats', icon: StatsIcon },
];

export function TabBar() {
  return (
    // A floating pill above the home indicator; --spacing-tabbar reserves its height for the page.
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-20 px-safe"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 rounded-full bg-surface/90 px-1 float-shadow backdrop-blur-xl">
        {TABS.map(({ to, label, icon: TabIcon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex h-full min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
                  isActive ? 'text-fg' : 'text-muted'
                }`
              }
            >
              {/* The active section gets a pill behind its icon; labels stay readable at 390 px. */}
              <span
                className="flex h-8 w-12 items-center justify-center rounded-full group-active:bg-surface-2 group-aria-[current=page]:bg-accent-fill group-aria-[current=page]:text-accent-fg"
                aria-hidden="true"
              >
                <TabIcon />
              </span>
              <span className="max-w-full truncate px-0.5">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

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
    // Full-width bar on the page background; the active section gets a bar along its top edge.
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg pb-safe"
    >
      <ul className="mx-auto grid h-tabbar max-w-lg grid-cols-5">
        {TABS.map(({ to, label, icon: TabIcon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex h-full min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-extrabold active:bg-surface ${
                  isActive ? 'text-fg' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-x-[18%] -top-px h-1 bg-indicator" aria-hidden="true" />
                  )}
                  <TabIcon />
                  <span className="max-w-full truncate px-0.5">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

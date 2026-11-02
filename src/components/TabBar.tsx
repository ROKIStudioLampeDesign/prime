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
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 pb-safe backdrop-blur-md"
    >
      <ul className="mx-auto grid h-tabbar max-w-lg grid-cols-5">
        {TABS.map(({ to, label, icon: TabIcon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
                  isActive ? 'text-accent' : 'text-muted',
                ].join(' ')
              }
            >
              <TabIcon />
              <span className="max-w-full truncate px-0.5">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

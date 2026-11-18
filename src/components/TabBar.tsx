import { NavLink } from 'react-router';
import type { ComponentType, SVGProps } from 'react';
import { BodyIcon, GymIcon, NutritionIcon, PrIcon, StatsIcon } from './icons';

interface Tab {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const TABS: Tab[] = [
  { to: '/', label: "Aujourd'hui", icon: PrIcon },
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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/80 pb-safe glow-up backdrop-blur-xl"
    >
      <ul className="mx-auto grid h-tabbar max-w-lg grid-cols-5">
        {TABS.map(({ to, label, icon: TabIcon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              // Icons only: the name is for screen readers. The active icon lights up in the accent.
              className={({ isActive }) =>
                `relative flex h-full min-h-11 items-center justify-center active:bg-surface ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <TabIcon
                    className={`size-7.5 ${isActive ? 'drop-shadow-[0_0_6px_var(--color-accent)]' : ''}`}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span className="sr-only">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

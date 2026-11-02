import { NavLink } from 'react-router';

const TABS = [
  { to: '/nutrition', label: 'Journal', end: true },
  { to: '/nutrition/foods', label: 'Produits', end: false },
  { to: '/nutrition/meals', label: 'Plats', end: false },
];

/** Journal / Produits / Plats switch at the top of the Alimentation section. */
export function NutritionTabs() {
  return (
    <nav aria-label="Alimentation" className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          replace
          className={({ isActive }) =>
            `flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold ${
              isActive ? 'bg-surface-2 text-fg' : 'text-muted'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

import type { ReactNode } from 'react';
import { SubTabs } from '../../components/SubTabs';

const STATS_TABS = [
  { to: '/stats', label: 'Poids', end: true },
  { to: '/stats/progress', label: 'Progression' },
  { to: '/stats/records', label: 'Records' },
  { to: '/stats/week', label: 'Semaine' },
];

export function StatsTabs() {
  return <SubTabs label="Statistiques" tabs={STATS_TABS} />;
}

/** Placeholder with the chart's height, so the layout doesn't jump when data arrives. */
export function ChartEmpty({
  height,
  children = 'Pas encore de données',
}: {
  height: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-center px-6 text-center text-sm text-muted" style={{ height }}>
      {children}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface p-3">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate numeral text-2xl leading-tight">{value}</dd>
      {hint && <dd className="truncate text-xs text-muted">{hint}</dd>}
    </div>
  );
}

/** Tooltip box matching the theme. */
export function TooltipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs shadow-lg shadow-black/30">
      <p className="mb-0.5 text-muted">{title}</p>
      {children}
    </div>
  );
}

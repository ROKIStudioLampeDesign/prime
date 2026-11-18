import type { ReactNode } from 'react';
import { BigNumber } from '../../components/BigNumber';
import { SubTabs } from '../../components/SubTabs';
import type { PersonalRecord } from '../../domain/strength';
import { formatWeight } from '../../lib/format';
import { shortDateLabel, toTime } from './chartUtils';
import { recordDetail } from './labels';

const STATS_TABS = [
  { to: '/stats', label: 'Poids', end: true },
  { to: '/stats/progress', label: 'Progression' },
  { to: '/stats/records', label: 'Records' },
  { to: '/stats/week', label: 'Bilan' },
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
    <div
      className="flex items-center justify-center px-6 text-center text-sm font-semibold text-muted"
      style={{ height }}
    >
      {children}
    </div>
  );
}

const BAND_TONES = {
  gym: { cell: 'bg-gym text-on-gym', secondary: '' },
  nutrition: { cell: 'bg-nutrition text-ink', secondary: 'text-ink/72' },
  paper: { cell: 'bg-paper text-ink', secondary: 'text-ink/72' },
};

interface BandTileProps {
  tone: keyof typeof BAND_TONES;
  label: string;
  value: string;
  unit?: string;
  hint?: ReactNode;
  /** Size of the figure when it fits, in rem. */
  maxRem?: number;
  className?: string;
}

/** A figure in a full-width grid of domain cells (inside an `edge` grid: it pads itself). */
export function BandTile({ tone, label, value, unit, hint, maxRem = 2.5, className = '' }: BandTileProps) {
  const { cell, secondary } = BAND_TONES[tone];
  return (
    <div className={`@container min-w-0 py-3 px-safe ${cell} ${className}`}>
      <dt className="truncate text-xs font-extrabold">{label}</dt>
      <dd className="mt-1">
        <BigNumber value={value} unit={unit} maxRem={maxRem} className="leading-none" />
      </dd>
      {hint && <dd className={`mt-1.5 truncate text-xs font-bold ${secondary}`}>{hint}</dd>}
    </div>
  );
}

/**
 * One personal record as a list row: value, then the set behind it and its date on the right.
 * A grid keeps `dt` and `dd` direct children of the row, as a `dl` group requires.
 */
export function RecordRow({ label, record }: { label: string; record: PersonalRecord | undefined }) {
  return (
    <div className="grid min-h-15 grid-cols-[minmax(0,1fr)_auto] content-center gap-x-3 py-2">
      <dt className="text-xs font-extrabold text-muted">{label}</dt>
      <dd className="text-xl leading-tight headline tabular-nums">
        {record ? `${formatWeight(Math.round(record.value * 10) / 10)} kg` : '—'}
      </dd>
      {record && (
        <dd className="col-start-2 row-span-2 row-start-1 self-center text-right text-xs font-semibold text-muted tabular-nums">
          <span className="block">{recordDetail(record)}</span>
          <span className="block">{shortDateLabel(toTime(record.date))}</span>
        </dd>
      )}
    </div>
  );
}

/** Tooltip box matching the theme. */
export function TooltipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-2 border-fg bg-bg px-3 py-2 text-xs font-semibold">
      <p className="mb-0.5 text-muted">{title}</p>
      {children}
    </div>
  );
}

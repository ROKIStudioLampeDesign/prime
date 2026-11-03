import { useLiveQuery } from 'dexie-react-hooks';
import { useToday } from '../../components/useToday';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { TrashIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { iconButton, Screen } from '../../components/Screen';
import { SegmentedControl } from '../../components/SegmentedControl';
import { deleteBodyWeight, getTargetWeight, listBodyWeights } from '../../db/bodyWeights';
import type { BodyWeightEntry } from '../../db/db';
import { movingAverage, pointsInRange, summarizeWeights, type WeightRange } from '../../domain/bodyWeight';
import type { LocalDate } from '../../domain/date';
import { formatWeight } from '../../lib/format';
import { axisProps, niceTicks, shortDateLabel, timeTicks, toTime } from './chartUtils';
import { kg, signedKg } from './labels';
import { ChartEmpty, StatsTabs, StatTile, TooltipBox } from './shared';
import { QuickAdd, TargetSheet } from './WeightForms';

const RANGES: { value: WeightRange; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: 'all', label: 'Tout' },
];

const CHART_HEIGHT = 220;

/** /stats — body weight. */
export function WeightScreen() {
  const entries = useLiveQuery(listBodyWeights);
  const target = useLiveQuery(async () => (await getTargetWeight()) ?? null);

  return (
    <Screen title="Stats">
      <StatsTabs />
      {entries === undefined || target === undefined ? (
        <Loading />
      ) : (
        <WeightContent entries={entries} target={target ?? undefined} />
      )}
    </Screen>
  );
}

function WeightContent({ entries, target }: { entries: BodyWeightEntry[]; target?: number }) {
  const [range, setRange] = useState<WeightRange>('3M');
  const [editingTarget, setEditingTarget] = useState(false);
  const [toDelete, setToDelete] = useState<BodyWeightEntry>();
  /** Bumped to re-initialise the quick-add form with another day's value. */
  const [formSeed, setFormSeed] = useState<{ date: LocalDate; kg?: number }>();
  const today = useToday();

  const visible = useMemo(() => pointsInRange(entries, range, today), [entries, range, today]);
  const summary = summarizeWeights(visible);
  // Average over all points so the first days of a range still have a full 7-day window behind them.
  const averages = useMemo(() => new Map(movingAverage(entries).map((p) => [p.date, p.kg])), [entries]);
  const data = visible.map((p) => ({ t: toTime(p.date), kg: p.kg, avg: averages.get(p.date) }));

  const values = visible.flatMap((p) => [p.kg, averages.get(p.date) ?? p.kg]);
  if (target !== undefined) values.push(target);
  const yTicks = values.length ? niceTicks(Math.min(...values) - 0.5, Math.max(...values) + 0.5) : [0, 1];
  const tMin = data[0]?.t ?? 0;
  const tMax = data.at(-1)?.t ?? 0;
  const last = entries.at(-1);

  return (
    <>
      <QuickAdd
        key={formSeed ? `${formSeed.date}-${formSeed.kg}` : 'default'}
        entries={entries}
        initialDate={formSeed?.date}
        initialKg={formSeed?.kg ?? last?.kg}
      />

      <div className="mt-4">
        <SegmentedControl label="Période" options={RANGES} value={range} onChange={setRange} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <StatTile
          label="Actuel"
          value={summary ? kg(summary.current.kg) : '—'}
          hint={summary && target !== undefined ? `cible ${kg(target)}` : undefined}
        />
        <StatTile label="Variation" value={summary ? signedKg(summary.change) : '—'} hint="sur la période" />
        <StatTile label="Min" value={summary ? kg(summary.min.kg) : '—'} />
        <StatTile label="Max" value={summary ? kg(summary.max.kg) : '—'} />
      </dl>

      <section className="mt-3 rounded-2xl bg-surface pt-3 pr-3" aria-label="Courbe de poids">
        {data.length === 0 ? (
          <ChartEmpty height={CHART_HEIGHT} />
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis
                {...axisProps}
                dataKey="t"
                type="number"
                scale="time"
                domain={[tMin, tMax]}
                ticks={timeTicks(tMin, tMax)}
                tickFormatter={shortDateLabel}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                {...axisProps}
                domain={[yTicks[0] ?? 0, yTicks.at(-1) ?? 1]}
                ticks={yTicks}
                width={36}
                allowDecimals={false}
                tickFormatter={(v: number) => formatWeight(v)}
              />
              {target !== undefined && (
                <ReferenceLine
                  y={target}
                  stroke="var(--color-fg)"
                  strokeOpacity={0.5}
                  strokeDasharray="4 4"
                  label={{
                    value: 'Cible',
                    position: 'insideTopLeft',
                    fill: 'var(--color-muted)',
                    fontSize: 11,
                  }}
                />
              )}
              <Tooltip
                cursor={{ stroke: 'var(--color-line)' }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
                  if (!active || !point) return null;
                  return (
                    <TooltipBox title={shortDateLabel(point.t)}>
                      <p className="font-semibold tabular-nums">{kg(point.kg)}</p>
                      {point.avg !== undefined && (
                        <p className="text-muted tabular-nums">moyenne 7 j : {kg(point.avg)}</p>
                      )}
                    </TooltipBox>
                  );
                }}
              />
              <Line
                dataKey="kg"
                stroke="none"
                dot={{ r: 2.5, fill: 'var(--color-muted)', stroke: 'none' }}
                activeDot={{ r: 4, fill: 'var(--color-fg)', stroke: 'none' }}
                isAnimationActive={false}
              />
              <Line
                dataKey="avg"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                type="monotone"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="flex items-center gap-4 px-4 pb-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted" /> Pesées
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent" /> Moyenne 7 jours
          </span>
        </p>
      </section>

      <section className="mt-3 overflow-hidden rounded-2xl bg-surface">
        <button
          type="button"
          onClick={() => setEditingTarget(true)}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left active:bg-surface-2"
        >
          <span>Poids cible</span>
          <span className="text-sm text-muted">{target !== undefined ? kg(target) : 'Non défini'}</span>
        </button>
      </section>

      {entries.length > 0 && (
        <section className="mt-4" aria-labelledby="recent-weights">
          <h2 id="recent-weights" className="mb-1 px-1 text-sm font-semibold text-muted">
            Dernières pesées
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
            {[...entries]
              .reverse()
              .slice(0, 7)
              .map((e) => (
                <li key={e.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setFormSeed({ date: e.date, kg: e.kg });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex min-h-12 flex-1 items-center justify-between gap-3 px-4 text-left active:bg-surface-2"
                  >
                    <span className="text-sm first-letter:uppercase">{shortDateLabel(toTime(e.date))}</span>
                    <span className="font-semibold tabular-nums">{kg(e.kg)}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer la pesée du ${shortDateLabel(toTime(e.date))}`}
                    className={`${iconButton} mr-1`}
                    onClick={() => setToDelete(e)}
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      <TargetSheet open={editingTarget} target={target} onClose={() => setEditingTarget(false)} />
      <ConfirmSheet
        open={toDelete !== undefined}
        title="Supprimer cette pesée ?"
        message={toDelete ? `${shortDateLabel(toTime(toDelete.date))} : ${kg(toDelete.kg)}` : undefined}
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (toDelete) void deleteBodyWeight(toDelete.id);
          setToDelete(undefined);
        }}
        onCancel={() => setToDelete(undefined)}
      />
    </>
  );
}

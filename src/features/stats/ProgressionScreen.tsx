import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { SegmentedControl } from '../../components/SegmentedControl';
import type { Exercise } from '../../db/db';
import { listExercises } from '../../db/exercises';
import { listExerciseHistory } from '../../db/stats';
import {
  MAX_REPS_FOR_1RM,
  personalRecords,
  RECORD_KINDS,
  RECORD_LABELS,
  sessionProgression,
  type HistorySet,
  type PersonalRecord,
  type ProgressMetric,
} from '../../domain/strength';
import { formatWeight } from '../../lib/format';
import { axisProps, niceTicks, shortDateLabel, timeTicks, toTime } from './chartUtils';
import { recordDetail } from './labels';
import { ChartEmpty, StatsTabs, TooltipBox } from './shared';

const CHART_HEIGHT = 220;

/** /stats/progress?exercise=id — progression chart and records of one exercise. */
export function ProgressionScreen() {
  const exercises = useLiveQuery(listExercises);
  const history = useLiveQuery(listExerciseHistory);

  return (
    <Screen title="Stats">
      <StatsTabs />
      {exercises === undefined || history === undefined ? (
        <Loading />
      ) : (
        <ProgressionContent exercises={exercises} history={history} />
      )}
    </Screen>
  );
}

function ProgressionContent({
  exercises,
  history,
}: {
  exercises: Exercise[];
  history: Map<number, HistorySet[]>;
}) {
  const [params, setParams] = useSearchParams();
  const [metric, setMetric] = useState<ProgressMetric>('maxWeight');

  // Only exercises with loaded history, most recently trained first.
  const options = useMemo(
    () =>
      exercises
        .filter((e) => (history.get(e.id) ?? []).some((s) => s.weightKg > 0))
        .map((e) => ({ exercise: e, last: history.get(e.id)?.at(-1)?.startedAt ?? 0 }))
        .sort((a, b) => b.last - a.last)
        .map((o) => o.exercise),
    [exercises, history],
  );

  if (options.length === 0) {
    return (
      <EmptyState
        title="Pas encore de données"
        description="Termine une séance avec des charges pour suivre ta progression ici."
        action={
          <Link
            to="/gym"
            className="flex min-h-12 items-center rounded-xl bg-accent px-5 font-semibold text-accent-fg"
          >
            Aller à la salle
          </Link>
        }
      />
    );
  }

  const requested = Number(params.get('exercise'));
  const selected = options.find((e) => e.id === requested) ?? (options[0] as Exercise);
  const sets = history.get(selected.id) ?? [];
  const points = sessionProgression(sets, metric).map((p) => ({ t: toTime(p.date), value: p.value }));
  const records = personalRecords(sets);
  const tMin = points[0]?.t ?? 0;
  const tMax = points.at(-1)?.t ?? 0;
  const values = points.map((p) => p.value);
  const yTicks = values.length
    ? niceTicks(Math.max(0, Math.min(...values) * 0.97), Math.max(...values) * 1.03)
    : [0, 1];

  return (
    <>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Exercice</span>
        <select
          value={selected.id}
          onChange={(e) => setParams({ exercise: e.target.value }, { replace: true })}
          className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-accent"
        >
          {options.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3">
        <SegmentedControl
          label="Mesure"
          options={[
            { value: 'maxWeight', label: 'Charge max' },
            { value: 'e1rm', label: '1RM estimé' },
          ]}
          value={metric}
          onChange={setMetric}
        />
      </div>

      <section className="mt-3 rounded-2xl bg-surface pt-3 pr-3" aria-label="Progression par séance">
        {points.length === 0 ? (
          <ChartEmpty height={CHART_HEIGHT}>
            {metric === 'e1rm'
              ? `Pas encore de données : aucune série de ${MAX_REPS_FOR_1RM} répétitions ou moins.`
              : 'Pas encore de données'}
          </ChartEmpty>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis
                {...axisProps}
                dataKey="t"
                type="number"
                scale="time"
                domain={[tMin, tMax]}
                ticks={timeTicks(tMin, tMax)}
                tickFormatter={shortDateLabel}
                padding={{ left: 12, right: 12 }}
              />
              <YAxis
                {...axisProps}
                domain={[yTicks[0] ?? 0, yTicks.at(-1) ?? 1]}
                ticks={yTicks}
                width={36}
                allowDecimals={false}
                tickFormatter={(v: number) => formatWeight(v)}
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-line)' }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof points)[number] | undefined;
                  if (!active || !p) return null;
                  return (
                    <TooltipBox title={shortDateLabel(p.t)}>
                      <p className="font-semibold tabular-nums">
                        {formatWeight(Math.round(p.value * 10) / 10)} kg
                      </p>
                    </TooltipBox>
                  );
                }}
              />
              <Line
                dataKey="value"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--color-accent)', stroke: 'none' }}
                activeDot={{ r: 5, fill: 'var(--color-fg)', stroke: 'none' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="px-4 pb-3 text-xs text-muted">
          {metric === 'e1rm'
            ? `1RM estimé par la formule d’Epley (charge × (1 + reps / 30)). Les séries de plus de ${MAX_REPS_FOR_1RM} répétitions sont ignorées : l’estimation y devient peu fiable.`
            : 'Charge la plus lourde soulevée à chaque séance.'}
        </p>
      </section>

      <h2 className="mt-5 mb-1 px-1 text-xs font-semibold tracking-wide text-muted uppercase">Records</h2>
      <dl className="flex flex-col gap-2">
        {RECORD_KINDS.map((kind) => (
          <RecordRow key={kind} label={RECORD_LABELS[kind]} record={records[kind]} />
        ))}
      </dl>
      <Link
        to="/stats/records"
        className="mt-3 flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-accent active:bg-surface-2"
      >
        Tous les records
      </Link>
    </>
  );
}

function RecordRow({ label, record }: { label: string; record: PersonalRecord | undefined }) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-4 py-2">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-lg font-bold tabular-nums">
          {record ? `${formatWeight(Math.round(record.value * 10) / 10)} kg` : '—'}
        </dd>
      </div>
      {record && (
        <dd className="shrink-0 text-right text-xs text-muted tabular-nums">
          <span className="block">{recordDetail(record)}</span>
          <span className="block">{shortDateLabel(toTime(record.date))}</span>
        </dd>
      )}
    </div>
  );
}

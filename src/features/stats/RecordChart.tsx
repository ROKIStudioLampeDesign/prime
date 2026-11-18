import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SegmentedControl } from '../../components/SegmentedControl';
import {
  MAX_REPS_FOR_1RM,
  newBests,
  personalRecords,
  RECORD_KINDS,
  RECORD_LABELS,
  sessionProgression,
  type HistorySet,
  type ProgressMetric,
} from '../../domain/strength';
import { formatWeight } from '../../lib/format';
import { axisProps, niceTicks, shortDateLabel, timeTicks, toTime } from './chartUtils';
import { ChartEmpty, RecordRow, TooltipBox } from './shared';

const CHART_HEIGHT = 220;

/**
 * One exercise's record over time, by heaviest load or estimated 1RM, then its records. Only new
 * bests are plotted: a lighter session neither drops the line nor moves it on.
 */
export function RecordChart({ sets }: { sets: readonly HistorySet[] }) {
  const [metric, setMetric] = useState<ProgressMetric>('maxWeight');
  const points = newBests(sessionProgression(sets, metric)).map((p) => ({
    t: toTime(p.date),
    value: p.value,
  }));
  const records = personalRecords(sets);
  const tMin = points[0]?.t ?? 0;
  const tMax = points.at(-1)?.t ?? 0;
  const values = points.map((p) => p.value);
  const yTicks = values.length
    ? niceTicks(Math.max(0, Math.min(...values) * 0.97), Math.max(...values) * 1.03)
    : [0, 1];

  return (
    <section aria-labelledby="record-chart" className="border-b border-line py-4">
      <h3 id="record-chart" className="text-xl leading-tight headline">
        Évolution du record
      </h3>
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
      <div className="mt-3">
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
                type="stepAfter"
                stroke="var(--color-gym-strong)"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: 'var(--color-gym-strong)', stroke: 'none' }}
                activeDot={{ r: 5, fill: 'var(--color-fg)', stroke: 'none' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <dl className="mt-3 divide-y divide-line border-t border-line">
        {RECORD_KINDS.map((kind) => (
          <RecordRow key={kind} label={RECORD_LABELS[kind]} record={records[kind]} />
        ))}
      </dl>
    </section>
  );
}

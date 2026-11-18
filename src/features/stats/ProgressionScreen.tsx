import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Navigate, useSearchParams } from 'react-router';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { useToday } from '../../components/useToday';
import type { Exercise } from '../../db/db';
import { listExercises } from '../../db/exercises';
import { listExerciseHistory } from '../../db/stats';
import { addDays, type LocalDate } from '../../domain/date';
import { LIFT_IDS, TRACKED_LIFTS } from '../../domain/lifts';
import { recentRecords, weeklyVolumes } from '../../domain/progressOverview';
import type { HistorySet } from '../../domain/strength';
import { formatInteger, formatWeight, formatWeightChange } from '../../lib/format';
import { axisProps, niceTicks, shortDateLabel, toTime } from './chartUtils';
import { PerfComparisonSection } from './PerfComparisonSection';
import { BandTile, ChartEmpty, StatsTabs, TooltipBox } from './shared';

const RECORD_DAYS = 30;
const VOLUME_WEEKS = 8;
const CHART_HEIGHT = 180;

/** "14,6 t", or kg under a tonne. */
const formatTonnes = (kg: number) =>
  kg >= 1000 ? `${formatWeight(Math.round(kg / 100) / 10)} t` : `${formatInteger(kg)} kg`;

/** /stats/progress — are you progressing: recent records, perfs against before, weekly volume. */
export function ProgressionScreen() {
  const [params] = useSearchParams();
  const exercises = useLiveQuery(listExercises);
  const history = useLiveQuery(listExerciseHistory);
  const today = useToday();

  // Former links to one exercise's chart: it lives in Records now.
  const exercise = params.get('exercise');
  if (exercise !== null) return <Navigate to={recordsLink(exercise, exercises)} replace />;

  return (
    <Screen title="Stats">
      <StatsTabs />
      {exercises === undefined || history === undefined ? (
        <Loading />
      ) : ![...history.values()].some((sets) => sets.length > 0) ? (
        <EmptyState
          title="Pas encore de données"
          description="Termine une séance avec des charges pour suivre ta progression ici."
          action={
            <Link
              to="/gym"
              className="flex min-h-12 items-center bg-accent-fill px-5 font-black text-accent-fg"
            >
              Aller à la salle
            </Link>
          }
        />
      ) : (
        <>
          <RecentRecords exercises={exercises} history={history} today={today} />
          <VolumeChart history={history} today={today} />
          <PerfComparisonSection today={today} />
        </>
      )}
    </Screen>
  );
}

/** A tracked lift opens its own tab (badges, goal); any other exercise opens `?exercise=`. */
function recordsLink(id: string | number, exercises: readonly Exercise[] | undefined): string {
  const seedId = exercises?.find((e) => String(e.id) === String(id))?.seedId;
  const lift = LIFT_IDS.find((l) => TRACKED_LIFTS[l].seedId === seedId);
  if (lift) return lift === 'bench' ? '/stats/records' : `/stats/records?lift=${lift}`;
  return `/stats/records?exercise=${id}`;
}

function RecentRecords({
  exercises,
  history,
  today,
}: {
  exercises: Exercise[];
  history: Map<number, HistorySet[]>;
  today: LocalDate;
}) {
  const records = recentRecords(history, addDays(today, -(RECORD_DAYS - 1)));
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const beaten = new Set(records.map((r) => r.exerciseId)).size;

  return (
    <section aria-labelledby="recent-records">
      <dl className="edge grid grid-cols-2 gap-0.5">
        <BandTile tone="gym" label="Records, 30 jours" value={String(records.length)} maxRem={3} />
        <BandTile tone="paper" label="Exercices en hausse" value={String(beaten)} maxRem={3} />
      </dl>
      <h2 id="recent-records" className="mt-5 text-[1.375rem] leading-tight headline">
        Derniers records
      </h2>
      {records.length === 0 ? (
        <p className="mt-3 border-2 border-dashed border-line px-6 py-8 text-center text-sm font-semibold text-muted">
          Pas de nouveau record ces 30 derniers jours. Tente un PR en séance !
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {records.slice(0, 8).map((r) => (
            <li key={`${r.exerciseId}-${r.startedAt}`}>
              <Link
                to={recordsLink(r.exerciseId, exercises)}
                className="grid min-h-15 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2 active:bg-surface"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-extrabold">
                    {names.get(r.exerciseId) ?? 'Exercice supprimé'}
                  </span>
                  <span className="block text-xs font-bold text-muted">{shortDateLabel(toTime(r.date))}</span>
                </span>
                <span className="text-right">
                  <span className="block text-xl leading-tight headline tabular-nums">
                    {formatWeight(r.weightKg)} kg
                  </span>
                  <span className="block text-xs font-black text-accent tabular-nums">
                    {formatWeightChange(r.weightKg - r.previousKg)} kg
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Training volume (load × reps) of the last weeks, the current one highlighted. */
function VolumeChart({ history, today }: { history: Map<number, HistorySet[]>; today: LocalDate }) {
  const weeks = weeklyVolumes(history, today, VOLUME_WEEKS).map((w) => ({
    ...w,
    label: shortDateLabel(toTime(w.weekOf)),
  }));
  const max = Math.max(...weeks.map((w) => w.volumeKg));
  const yTicks = niceTicks(0, max * 1.05, 3);
  const average = weeks.slice(0, -1).reduce((sum, w) => sum + w.volumeKg, 0) / Math.max(1, weeks.length - 1);

  return (
    <section aria-labelledby="volume-weeks" className="mt-8">
      <h2 id="volume-weeks" className="flex items-baseline justify-between gap-3">
        <span className="text-[1.375rem] leading-tight headline">Volume hebdo</span>
        <span className="shrink-0 text-xs font-bold text-muted tabular-nums">
          moy. {formatTonnes(average)}
        </span>
      </h2>
      <div className="mt-2">
        {max === 0 ? (
          <ChartEmpty height={CHART_HEIGHT} />
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={weeks} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <XAxis {...axisProps} dataKey="label" interval={1} />
              <YAxis
                {...axisProps}
                width={40}
                domain={[0, yTicks.at(-1) ?? 1]}
                ticks={yTicks}
                tickFormatter={(v: number) => (v >= 1000 ? `${formatWeight(v / 1000)} t` : String(v))}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-line)', fillOpacity: 0.4 }}
                content={({ active, payload }) => {
                  const w = payload?.[0]?.payload as (typeof weeks)[number] | undefined;
                  if (!active || !w) return null;
                  return (
                    <TooltipBox title={`Semaine du ${w.label}`}>
                      <p className="font-semibold tabular-nums">{formatInteger(w.volumeKg)} kg</p>
                    </TooltipBox>
                  );
                }}
              />
              <Bar dataKey="volumeKg" isAnimationActive={false} maxBarSize={28}>
                {weeks.map((w, i) => (
                  <Cell
                    key={w.weekOf}
                    fill="var(--color-gym-strong)"
                    fillOpacity={i === weeks.length - 1 ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-8" />
    </section>
  );
}

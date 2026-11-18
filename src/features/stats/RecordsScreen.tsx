import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { BigNumber } from '../../components/BigNumber';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import type { Exercise } from '../../db/db';
import { listExercises } from '../../db/exercises';
import { getLiftGoalKg } from '../../db/liftGoals';
import { listExerciseHistory } from '../../db/stats';
import { DEFAULT_LIFT, LIFT_IDS, parseLiftParam, TRACKED_LIFTS, type LiftId } from '../../domain/lifts';
import {
  latestRecordDate,
  personalRecords,
  RECORD_LABELS,
  type HistorySet,
  type PersonalRecords,
  type RecordKind,
} from '../../domain/strength';
import { formatWeight } from '../../lib/format';
import { LiftBadges } from './LiftBadges';
import { LiftGoal } from './LiftGoal';
import { RecordChart } from './RecordChart';
import { shortDateLabel, toTime } from './chartUtils';
import { recordDetail } from './labels';
import { StatsTabs } from './shared';

const TRACKED_SEED_IDS = new Set(LIFT_IDS.map((id) => TRACKED_LIFTS[id].seedId));

/**
 * /stats/records?lift=squat — the records of one lift (TRACKED_LIFTS, the bench by default), with
 * its badges and goal; /stats/records?exercise=id — the record of any other exercise.
 */
export function RecordsScreen() {
  const [params] = useSearchParams();
  const exercises = useLiveQuery(listExercises);
  const history = useLiveQuery(listExerciseHistory);
  const requested = Number(params.get('exercise'));
  const other = exercises?.find((e) => e.id === requested && !TRACKED_SEED_IDS.has(e.seedId ?? ''));
  const lift = parseLiftParam(params.get('lift'));

  return (
    <Screen title="Stats">
      <StatsTabs />
      {exercises === undefined || history === undefined ? (
        <Loading />
      ) : (
        <>
          <LiftPicker current={other ? undefined : lift} />
          <OtherExercisePicker exercises={exercises} history={history} current={other?.id} />
          {other ? (
            <ExerciseRecords key={other.id} exercise={other} history={history.get(other.id) ?? []} />
          ) : (
            <LiftView key={lift} lift={lift} exercises={exercises} history={history} />
          )}
        </>
      )}
    </Screen>
  );
}

/** The five lifts as square tabs; the chosen one is kept in the URL (replace: no history spam). */
function LiftPicker({ current }: { current: LiftId | undefined }) {
  return (
    <nav aria-label="Mouvement suivi" className="grid grid-cols-5 gap-1">
      {LIFT_IDS.map((id) => {
        const active = id === current;
        return (
          <Link
            key={id}
            to={id === DEFAULT_LIFT ? '.' : `?lift=${id}`}
            replace
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center justify-center px-0.5 text-center text-[13px] leading-tight font-extrabold ${active ? 'bg-gym text-on-gym' : 'bg-surface text-muted active:bg-surface-2'}`}
          >
            {TRACKED_LIFTS[id].label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Any other exercise with loaded history, most recently trained first. Hidden when there is none. */
function OtherExercisePicker({
  exercises,
  history,
  current,
}: {
  exercises: Exercise[];
  history: Map<number, HistorySet[]>;
  current: number | undefined;
}) {
  const navigate = useNavigate();
  const options = useMemo(
    () =>
      exercises
        .filter(
          (e) =>
            !TRACKED_SEED_IDS.has(e.seedId ?? '') && (history.get(e.id) ?? []).some((s) => s.weightKg > 0),
        )
        .map((e) => ({ exercise: e, last: history.get(e.id)?.at(-1)?.startedAt ?? 0 }))
        .sort((a, b) => b.last - a.last)
        .map((o) => o.exercise),
    [exercises, history],
  );
  if (options.length === 0) return <div className="mb-4" />;
  return (
    <label className="mt-2 mb-4 block">
      <span className="sr-only">Autre exercice</span>
      <select
        value={current ?? ''}
        onChange={(e) =>
          void navigate(e.target.value === '' ? '.' : `?exercise=${e.target.value}`, { replace: true })
        }
        className={`h-12 w-full border-2 bg-bg px-3 text-base font-extrabold outline-none focus:border-accent ${current === undefined ? 'border-line text-muted' : 'border-fg text-fg'}`}
      >
        <option value="">Autre exercice…</option>
        {options.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function LiftView({
  lift,
  exercises,
  history,
}: {
  lift: LiftId;
  exercises: Exercise[];
  history: Map<number, HistorySet[]>;
}) {
  const { seedId, label } = TRACKED_LIFTS[lift];
  const name = label.toLowerCase();
  const goal = useLiveQuery(async () => ({ kg: await getLiftGoalKg(lift) }), [lift]);
  const exercise = exercises.find((e) => e.seedId === seedId);
  const sets = useMemo(() => (exercise && history.get(exercise.id)) ?? [], [exercise, history]);
  const records = useMemo(() => personalRecords(sets), [sets]);

  if (goal === undefined) return <Loading />;
  if (!exercise || latestRecordDate(records) === undefined) {
    return (
      <>
        <EmptyState
          title={`Pas encore de record au ${name}`}
          description={`Valide des séries de ${name} avec des charges : tes records apparaîtront ici.`}
        />
        <LiftGoal lift={lift} records={records} goalKg={goal.kg} />
      </>
    );
  }
  return (
    <>
      <RecordBand name={label} records={records} />
      <LiftGoal lift={lift} records={records} goalKg={goal.kg} />
      <RecordChart sets={sets} />
      <LiftBadges lift={lift} bestKg={records.weight?.weightKg ?? 0} history={sets} />
    </>
  );
}

function ExerciseRecords({ exercise, history }: { exercise: Exercise; history: readonly HistorySet[] }) {
  const records = useMemo(() => personalRecords(history), [history]);
  return (
    <>
      <RecordBand name={exercise.name} records={records} />
      <RecordChart sets={history} />
    </>
  );
}

/** The current PR: the heaviest load actually lifted (no estimated 1RM, no volume). */
function RecordBand({ name, records }: { name: string; records: PersonalRecords }) {
  const lead: RecordKind = 'weight';
  const top = records[lead];
  return (
    <section aria-labelledby="lift-title" className="@container bleed bg-gym py-4 text-on-gym">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="lift-title" className="min-w-0 text-[1.875rem] leading-none headline">
          {name}
        </h2>
        {top && <p className="shrink-0 text-sm font-bold">{shortDateLabel(toTime(top.date))}</p>}
      </div>
      <BigNumber
        value={top ? formatWeight(Math.round(top.value * 10) / 10) : '—'}
        unit={top ? 'kg' : undefined}
        maxRem={7}
        className="mt-3 leading-[0.82]"
      />
      <p className="mt-2.5 text-sm font-semibold tabular-nums">
        {RECORD_LABELS[lead]}
        {top && ` · ${recordDetail(top)}`}
      </p>
    </section>
  );
}

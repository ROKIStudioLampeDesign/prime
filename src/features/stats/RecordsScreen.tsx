import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BigNumber } from '../../components/BigNumber';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
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
import { shortDateLabel, toTime } from './chartUtils';
import { recordDetail } from './labels';
import { StatsTabs } from './shared';

/** /stats/records?lift=squat — the records of one lift (TRACKED_LIFTS), the bench by default. */
export function RecordsScreen() {
  const [params] = useSearchParams();
  const lift = parseLiftParam(params.get('lift'));
  const { seedId, label } = TRACKED_LIFTS[lift];
  const exercises = useLiveQuery(listExercises);
  const history = useLiveQuery(listExerciseHistory);
  // Carries its lift: useLiveQuery briefly returns the previous lift's goal when the lift changes.
  const goal = useLiveQuery(async () => ({ lift, kg: await getLiftGoalKg(lift) }), [lift]);
  const exercise = exercises?.find((e) => e.seedId === seedId);
  const records = useMemo(
    () => personalRecords((exercise && history?.get(exercise.id)) ?? []),
    [exercise, history],
  );
  const name = label.toLowerCase();

  return (
    <Screen title="Stats">
      <StatsTabs />
      <LiftPicker current={lift} />
      {exercises === undefined || history === undefined || goal === undefined || goal.lift !== lift ? (
        <Loading />
      ) : !exercise || latestRecordDate(records) === undefined ? (
        <div key={lift}>
          <EmptyState
            title={`Pas encore de record au ${name}`}
            description={`Valide des séries de ${name} avec des charges : tes records apparaîtront ici.`}
          />
          <LiftGoal lift={lift} records={records} goalKg={goal.kg} />
        </div>
      ) : (
        <LiftRecords
          key={lift}
          lift={lift}
          id={exercise.id}
          records={records}
          goalKg={goal.kg}
          history={history.get(exercise.id) ?? []}
        />
      )}
    </Screen>
  );
}

/** The five lifts as square tabs; the chosen one is kept in the URL (replace: no history spam). */
function LiftPicker({ current }: { current: LiftId }) {
  return (
    <nav aria-label="Mouvement suivi" className="mb-4 grid grid-cols-5 gap-1">
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

interface LiftRecordsProps {
  lift: LiftId;
  id: number;
  records: PersonalRecords;
  goalKg: number | undefined;
  history: readonly HistorySet[];
}

function LiftRecords({ lift, id, records, goalKg, history }: LiftRecordsProps) {
  // Only the current PR: the heaviest load actually lifted (no estimated 1RM, no volume).
  const lead: RecordKind = 'weight';
  const top = records[lead];
  return (
    <>
      <section aria-labelledby="lift-title" className="@container bleed bg-gym py-4 text-on-gym">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="lift-title" className="text-[1.875rem] leading-none headline">
            {TRACKED_LIFTS[lift].label}
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

      <LiftGoal lift={lift} records={records} goalKg={goalKg} />
      <LiftBadges lift={lift} bestKg={records.weight?.weightKg ?? 0} history={history} />

      <Link
        to={`/stats/progress?exercise=${id}`}
        className="mt-4 flex min-h-12 items-center justify-center border-2 border-fg font-black [font-stretch:112%] active:bg-surface"
      >
        Voir la progression
      </Link>
    </>
  );
}

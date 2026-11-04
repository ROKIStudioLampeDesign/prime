import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { BigNumber } from '../../components/BigNumber';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { BENCH_SEED_ID } from '../../db/exerciseSeed';
import { listExercises } from '../../db/exercises';
import { getBenchGoalKg } from '../../db/liftGoals';
import { listExerciseHistory } from '../../db/stats';
import {
  latestRecordDate,
  personalRecords,
  RECORD_KINDS,
  RECORD_LABELS,
  type PersonalRecords,
  type RecordKind,
} from '../../domain/strength';
import { formatWeight } from '../../lib/format';
import { BenchGoal } from './BenchGoal';
import { shortDateLabel, toTime } from './chartUtils';
import { recordDetail } from './labels';
import { RecordRow, StatsTabs } from './shared';

/** /stats/records — the bench records: the one lift followed here (see BENCH_SEED_ID). */
export function RecordsScreen() {
  const exercises = useLiveQuery(listExercises);
  const history = useLiveQuery(listExerciseHistory);
  // Wrapped so "no goal" (undefined) is not mistaken for "still loading".
  const goal = useLiveQuery(async () => ({ kg: await getBenchGoalKg() }));
  const bench = exercises?.find((e) => e.seedId === BENCH_SEED_ID);
  const records = useMemo(() => personalRecords((bench && history?.get(bench.id)) ?? []), [bench, history]);

  return (
    <Screen title="Stats">
      <StatsTabs />
      {exercises === undefined || history === undefined || goal === undefined ? (
        <Loading />
      ) : !bench || latestRecordDate(records) === undefined ? (
        <>
          <EmptyState
            title="Pas encore de record au bench"
            description="Valide des séries de bench avec des charges : tes records apparaîtront ici."
          />
          <BenchGoal records={records} goalKg={goal.kg} />
        </>
      ) : (
        <BenchRecords id={bench.id} name={bench.name} records={records} goalKg={goal.kg} />
      )}
    </Screen>
  );
}

interface BenchRecordsProps {
  id: number;
  name: string;
  records: PersonalRecords;
  goalKg: number | undefined;
}

function BenchRecords({ id, name, records, goalKg }: BenchRecordsProps) {
  // The estimated 1RM leads; without one (only sets of many reps), the heaviest load does.
  const lead: RecordKind = records.e1rm ? 'e1rm' : 'weight';
  const top = records[lead];
  return (
    <>
      <section aria-labelledby="bench-title" className="@container bleed bg-gym py-4 text-on-gym">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="bench-title" className="text-[1.875rem] leading-none headline">
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

      <BenchGoal records={records} goalKg={goalKg} />

      <dl className="divide-y divide-line border-b border-line">
        {RECORD_KINDS.filter((kind) => kind !== lead).map((kind) => (
          <RecordRow key={kind} label={RECORD_LABELS[kind]} record={records[kind]} />
        ))}
      </dl>

      <Link
        to={`/stats/progress?exercise=${id}`}
        className="mt-4 flex min-h-12 items-center justify-center border-2 border-fg font-black [font-stretch:112%] active:bg-surface"
      >
        Voir la progression
      </Link>
    </>
  );
}

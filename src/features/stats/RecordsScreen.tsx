import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { listExercises } from '../../db/exercises';
import { listExerciseHistory } from '../../db/stats';
import { latestRecordDate, personalRecords, RECORD_KINDS, RECORD_LABELS } from '../../domain/strength';
import { shortDateLabel, toTime } from './chartUtils';
import { kg, recordDetail } from './labels';
import { StatsTabs } from './shared';

/** /stats/records — personal records of every exercise, most recently improved first. */
export function RecordsScreen() {
  const exercises = useLiveQuery(listExercises);
  const history = useLiveQuery(listExerciseHistory);

  const rows = useMemo(() => {
    if (!exercises || !history) return undefined;
    return exercises
      .map((exercise) => {
        const records = personalRecords(history.get(exercise.id) ?? []);
        return { exercise, records, latest: latestRecordDate(records) };
      })
      .filter((r) => r.latest !== undefined)
      .sort((a, b) =>
        (a.latest ?? '') < (b.latest ?? '') ? 1 : (a.latest ?? '') > (b.latest ?? '') ? -1 : 0,
      );
  }, [exercises, history]);

  return (
    <Screen title="Stats">
      <StatsTabs />
      {rows === undefined ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Pas encore de données"
          description="Tes records apparaîtront après tes premières séances avec des charges."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ exercise, records, latest }) => (
            <li key={exercise.id}>
              <Link
                to={`/stats/progress?exercise=${exercise.id}`}
                className="block rounded-2xl bg-surface px-4 py-3 active:bg-surface-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-semibold">{exercise.name}</p>
                  {latest && <p className="shrink-0 text-xs text-muted">{shortDateLabel(toTime(latest))}</p>}
                </div>
                <dl className="mt-1.5 grid grid-cols-3 gap-2">
                  {RECORD_KINDS.map((kind) => {
                    const r = records[kind];
                    return (
                      <div key={kind} className="min-w-0">
                        <dt className="truncate text-[11px] text-muted">{RECORD_LABELS[kind]}</dt>
                        <dd className="truncate text-sm font-semibold tabular-nums">
                          {r ? kg(r.value) : '—'}
                        </dd>
                        {r && (
                          <dd className="truncate text-[11px] text-muted tabular-nums">{recordDetail(r)}</dd>
                        )}
                      </div>
                    );
                  })}
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}

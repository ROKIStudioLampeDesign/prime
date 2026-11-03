import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { listWorkoutSummaries } from '../../db/workouts';
import { formatDuration, formatVolume } from '../../lib/format';
import { exerciseName, useExercisesById } from './exerciseData';
import { GymTabs } from './shared';
import { shortDay, workoutTitle } from './workoutLabels';

export function HistoryScreen() {
  const summaries = useLiveQuery(listWorkoutSummaries);
  const exercises = useExercisesById();

  return (
    <Screen title="Salle">
      <GymTabs />
      {summaries === undefined || exercises === undefined ? (
        <Loading />
      ) : summaries.length === 0 ? (
        <EmptyState
          title="Aucune séance terminée"
          description="Tes séances apparaîtront ici une fois terminées."
          action={
            <Link
              to="/gym"
              className="flex min-h-12 items-center rounded-xl bg-accent-fill px-5 font-semibold text-accent-fg"
            >
              Commencer une séance
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {summaries.map(({ workout, stats, exerciseIds }) => (
            <li className="list-row [--row-h:5.5rem]" key={workout.id}>
              <Link
                to={`/gym/workout/${workout.id}`}
                className="block rounded-2xl bg-surface px-4 py-3 active:bg-surface-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-semibold">{workoutTitle(workout)}</p>
                  <p className="shrink-0 text-xs text-muted first-letter:uppercase">
                    {shortDay(workout.date)}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-muted tabular-nums">
                  {stats.durationMs !== undefined &&
                    stats.durationMs > 0 &&
                    `${formatDuration(stats.durationMs)} · `}
                  {stats.completedSets} série{stats.completedSets > 1 ? 's' : ''} ·{' '}
                  {formatVolume(stats.volumeKg)}
                </p>
                {exerciseIds.length > 0 && (
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {exerciseIds.map((id) => exerciseName(exercises, id)).join(', ')}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { listWorkoutSummaries } from '../../db/workouts';
import type { LocalDate } from '../../domain/date';
import { formatDuration, formatVolume } from '../../lib/format';
import { exerciseName, useExercisesById } from './exerciseData';
import { GymTabs } from './shared';
import { dayBlock, workoutTitle } from './workoutLabels';

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
              className="flex min-h-12 items-center bg-accent-fill px-5 font-black text-accent-fg"
            >
              Commencer une séance
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line border-b border-line">
          {summaries.map(({ workout, stats, exerciseIds }) => (
            <li className="list-row [--row-h:5.5rem]" key={workout.id}>
              <Link
                to={`/gym/workout/${workout.id}`}
                className="flex items-center gap-3.5 py-3 active:opacity-60"
              >
                <DateBlock date={workout.date} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg leading-tight headline">{workoutTitle(workout)}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-muted tabular-nums">
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}

/** Weekday over a big day number, so the list reads like a calendar. */
function DateBlock({ date }: { date: LocalDate }) {
  const { weekday, day } = dayBlock(date);
  return (
    <span className="flex w-11 shrink-0 flex-col items-center">
      <span className="text-xs font-extrabold text-muted first-letter:uppercase">{weekday}</span>
      <span className="text-[1.75rem] leading-none numeral">{day}</span>
    </span>
  );
}

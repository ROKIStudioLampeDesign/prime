import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { useLongPress } from '../../components/useLongPress';
import type { Workout } from '../../db/db';
import { deleteWorkout, listWorkoutSummaries, type WorkoutSummary } from '../../db/workouts';
import type { LocalDate } from '../../domain/date';
import { formatDuration, formatVolume } from '../../lib/format';
import { exerciseName, useExercisesById } from './exerciseData';
import { GymTabs } from './shared';
import { dayBlock, workoutTitle } from './workoutLabels';

export function HistoryScreen() {
  const summaries = useLiveQuery(listWorkoutSummaries);
  const exercises = useExercisesById();
  const [toDelete, setToDelete] = useState<Workout | undefined>(undefined);

  async function confirmDelete() {
    const id = toDelete?.id;
    setToDelete(undefined);
    if (id !== undefined) await deleteWorkout(id);
  }

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
        <>
          <ul className="divide-y divide-line border-b border-line">
            {summaries.map((summary) => (
              <HistoryRow
                key={summary.workout.id}
                summary={summary}
                exerciseNames={summary.exerciseIds.map((id) => exerciseName(exercises, id))}
                onLongPress={() => setToDelete(summary.workout)}
              />
            ))}
          </ul>
          <p className="py-4 text-center text-xs text-muted">Maintiens une séance pour la supprimer.</p>
        </>
      )}
      <ConfirmSheet
        open={toDelete !== undefined}
        title="Supprimer la séance ?"
        message={
          toDelete
            ? `${workoutTitle(toDelete)} : toutes ses séries seront supprimées. Cette action est définitive.`
            : undefined
        }
        confirmLabel="Supprimer"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(undefined)}
      />
    </Screen>
  );
}

interface HistoryRowProps {
  summary: WorkoutSummary;
  exerciseNames: string[];
  onLongPress: () => void;
}

/** One finished workout: tap opens it, long press asks to delete it. */
function HistoryRow({ summary: { workout, stats }, exerciseNames, onLongPress }: HistoryRowProps) {
  const longPress = useLongPress(onLongPress);
  return (
    <li className="list-row [--row-h:5.5rem]">
      <Link
        to={`/gym/workout/${workout.id}`}
        {...longPress}
        className="flex items-center gap-3.5 py-3 select-none [-webkit-touch-callout:none] active:opacity-60"
      >
        <DateBlock date={workout.date} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-tight headline">{workoutTitle(workout)}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-muted tabular-nums">
            {stats.durationMs !== undefined &&
              stats.durationMs > 0 &&
              `${formatDuration(stats.durationMs)} · `}
            {stats.completedSets} série{stats.completedSets > 1 ? 's' : ''} · {formatVolume(stats.volumeKg)}
          </p>
          {exerciseNames.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted">{exerciseNames.join(', ')}</p>
          )}
        </div>
      </Link>
    </li>
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

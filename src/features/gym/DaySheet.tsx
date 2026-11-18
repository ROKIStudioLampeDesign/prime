import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { useToday } from '../../components/useToday';
import type { Exercise, Workout } from '../../db/db';
import { setGymDay, setRestDay } from '../../db/gymDays';
import { listTemplates } from '../../db/templates';
import { createPastWorkout, getWorkoutSets } from '../../db/workouts';
import type { LocalDate } from '../../domain/date';
import { groupByExercise } from '../../domain/workout';
import { formatDuration, setLoadLabel } from '../../lib/format';
import { exerciseName, useExercisesById } from './exerciseData';
import { longDay, workoutTitle } from './workoutLabels';

interface DaySheetProps {
  date: LocalDate | undefined;
  workouts: Workout[];
  /** Manual attendance flag for the day. */
  manual: boolean;
  /** Rest day mark (ignored when the day has a workout). */
  rest: boolean;
  onClose: () => void;
}

/**
 * A calendar day: its workouts in detail (every set's load and reps), or the gym/rest switches on
 * a day without one; "Ajouter une séance" at the bottom logs one for that day.
 */
export function DaySheet({ date, workouts, manual, rest, onClose }: DaySheetProps) {
  return (
    <BottomSheet open={date !== undefined} onClose={onClose} title={date ? longDay(date) : ''}>
      {date && (
        <DayContent
          key={date}
          date={date}
          workouts={workouts}
          manual={manual}
          rest={rest}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function DayContent({ date, workouts, manual, rest, onClose }: DaySheetProps & { date: LocalDate }) {
  const today = useToday();
  const exercises = useExercisesById();
  const hasWorkout = workouts.length > 0;

  return (
    <>
      {hasWorkout ? (
        exercises === undefined ? null : (
          <div className="divide-y divide-line border-b border-line">
            {workouts.map((w) => (
              <WorkoutDetail key={w.id} workout={w} exercises={exercises} onClose={onClose} />
            ))}
          </div>
        )
      ) : (
        <>
          <label className="flex min-h-12 items-center justify-between gap-3 bg-bg px-4">
            <span>Jour de salle</span>
            <input
              type="checkbox"
              role="switch"
              checked={manual}
              onChange={(e) => void setGymDay(date, e.target.checked)}
              className="size-6 accent-(--color-accent)"
            />
          </label>
          <label className="mt-2 flex min-h-12 items-center justify-between gap-3 bg-bg px-4">
            <span>Jour de repos</span>
            <input
              type="checkbox"
              role="switch"
              checked={rest}
              onChange={(e) => void setRestDay(date, e.target.checked)}
              className="size-6 accent-(--color-accent)"
            />
          </label>
        </>
      )}

      {date <= today && <AddWorkout date={date} onClose={onClose} />}
    </>
  );
}

/** One workout of the day: title and duration, then each exercise with its sets. */
function WorkoutDetail({
  workout,
  exercises,
  onClose,
}: {
  workout: Workout;
  exercises: ReadonlyMap<number, Exercise>;
  onClose: () => void;
}) {
  const sets = useLiveQuery(() => getWorkoutSets(workout.id), [workout.id]);
  const active = workout.status === 'active';
  const groups = groupByExercise((sets ?? []).filter((s) => active || s.completed));

  return (
    <section aria-label={workoutTitle(workout)} className="py-3">
      <Link
        to={`/gym/workout/${workout.id}`}
        onClick={onClose}
        className="flex min-h-11 items-center justify-between gap-3 active:opacity-60"
      >
        <span className="truncate text-xl leading-tight headline">{workoutTitle(workout)}</span>
        <span className="shrink-0 text-sm font-extrabold text-accent">
          {active ? 'En cours' : workout.endedAt ? formatDuration(workout.endedAt - workout.startedAt) : ''} ›
        </span>
      </Link>
      {sets === undefined ? null : groups.length === 0 ? (
        <p className="mt-1 text-sm font-semibold text-muted">Aucune série validée.</p>
      ) : (
        <ul className="mt-1 space-y-2.5">
          {groups.map((g) => (
            <li key={g.exerciseId}>
              <p className="text-[15px] leading-tight font-extrabold">
                {exerciseName(exercises, g.exerciseId)}
              </p>
              <ol className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {g.sets.map((s, i) => (
                  <li
                    key={s.id}
                    className={`text-sm font-bold tabular-nums ${s.completed ? '' : 'text-muted'}`}
                  >
                    <span className="text-muted">{i + 1}.</span> {setLoadLabel(s)} × {s.reps}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Ajouter une séance": opens the choice of a free workout or a template for that day. */
function AddWorkout({ date, onClose }: { date: LocalDate; onClose: () => void }) {
  const navigate = useNavigate();
  const templates = useLiveQuery(listTemplates);
  const [open, setOpen] = useState(false);

  async function logWorkout(templateId?: number) {
    const id = await createPastWorkout(date, templateId);
    onClose();
    void navigate(`/gym/workout/${id}`);
  }

  if (!open) {
    return (
      <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
        Ajouter une séance
      </Button>
    );
  }
  return (
    <div className="mt-4">
      <Button className="w-full" onClick={() => void logWorkout()}>
        Séance libre
      </Button>
      <h3 className="mt-4 mb-1 text-sm font-semibold text-muted">Depuis un modèle</h3>
      {templates === undefined ? null : templates.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun modèle pour l’instant.{' '}
          <Link to="/gym/templates/new" className="font-semibold text-accent" onClick={onClose}>
            Créer un modèle
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => void logWorkout(t.id)}
                className="flex min-h-12 w-full items-center justify-between gap-3 text-left active:bg-surface-2"
              >
                <span className="truncate font-semibold">{t.name}</span>
                <span className="shrink-0 text-sm text-muted">
                  {t.exercises.length} exercice{t.exercises.length > 1 ? 's' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { useToday } from '../../components/useToday';
import type { Workout } from '../../db/db';
import { setGymDay, setRestDay } from '../../db/gymDays';
import { listTemplates } from '../../db/templates';
import { createPastWorkout } from '../../db/workouts';
import type { LocalDate } from '../../domain/date';
import { formatDuration } from '../../lib/format';
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

export function DaySheet({ date, workouts, manual, rest, onClose }: DaySheetProps) {
  const navigate = useNavigate();
  const today = useToday();
  const hasWorkout = workouts.length > 0;
  const attended = hasWorkout || manual;
  const isPastOrToday = date !== undefined && date <= today;
  const templates = useLiveQuery(listTemplates);

  async function logWorkout(day: LocalDate, templateId?: number) {
    const id = await createPastWorkout(day, templateId);
    onClose();
    void navigate(`/gym/workout/${id}`);
  }

  return (
    <BottomSheet open={date !== undefined} onClose={onClose} title={date ? longDay(date) : ''}>
      {date && (
        <>
          {hasWorkout && (
            <ul className="mb-4 divide-y divide-line overflow-hidden rounded-2xl bg-bg">
              {workouts.map((w) => (
                <li key={w.id}>
                  <Link
                    to={`/gym/workout/${w.id}`}
                    onClick={onClose}
                    className="flex min-h-14 items-center justify-between gap-3 px-4 active:bg-surface-2"
                  >
                    <span className="truncate font-semibold">{workoutTitle(w)}</span>
                    <span className="shrink-0 text-sm text-muted">
                      {w.status === 'active'
                        ? 'En cours'
                        : w.endedAt
                          ? formatDuration(w.endedAt - w.startedAt)
                          : 'Ouvrir'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-bg px-4">
            <span>
              <span className="block">Jour de salle</span>
              {hasWorkout && (
                <span className="block text-xs text-muted">Compté automatiquement (séance notée)</span>
              )}
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={attended}
              disabled={hasWorkout}
              onChange={(e) => void setGymDay(date, e.target.checked)}
              className="size-6 accent-(--color-accent)"
            />
          </label>

          {!hasWorkout && (
            <label className="mt-2 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-bg px-4">
              <span>
                <span className="block">Jour de repos</span>
                <span className="block text-xs text-muted">
                  Pas de salle, tes repas se notent normalement
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={rest}
                onChange={(e) => void setRestDay(date, e.target.checked)}
                className="size-6 accent-(--color-accent)"
              />
            </label>
          )}

          {isPastOrToday && (
            <>
              <Button variant="secondary" className="mt-3 w-full" onClick={() => void logWorkout(date)}>
                Noter une séance ce jour-là
              </Button>
              {templates !== undefined && templates.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-muted">Depuis un modèle</h3>
                  <p className="mb-2 text-xs text-muted">
                    Les exercices et les séries, poids et reps à remplir.
                  </p>
                  <ul className="divide-y divide-line border-y border-line">
                    {templates.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => void logWorkout(date, t.id)}
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
                </>
              )}
            </>
          )}
        </>
      )}
    </BottomSheet>
  );
}

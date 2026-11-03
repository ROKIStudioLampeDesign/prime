import { useLiveQuery } from 'dexie-react-hooks';
import { useToday } from '../../components/useToday';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { BackIcon, ForwardIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { iconButton, Screen } from '../../components/Screen';
import { useNow } from '../../components/useNow';
import type { Workout } from '../../db/db';
import { listGymDays, setGymDay } from '../../db/gymDays';
import { listTemplates } from '../../db/templates';
import {
  createPastWorkout,
  getActiveWorkout,
  getWorkoutSets,
  listAllWorkouts,
  startWorkout,
} from '../../db/workouts';
import { type LocalDate } from '../../domain/date';
import { attendedDates, monthGrid, sessionsInMonth, weeklyStreak } from '../../domain/gymCalendar';
import { formatDuration } from '../../lib/format';
import { GymTabs } from './shared';
import { longDay, workoutTitle } from './workoutLabels';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function parseMonth(raw: string | null, today: LocalDate): { year: number; month: number } {
  const match = raw && /^(\d{4})-(\d{2})$/.exec(raw);
  const year = match ? Number(match[1]) : Number(today.slice(0, 4));
  const month = match ? Number(match[2]) : Number(today.slice(5, 7));
  return month >= 1 && month <= 12 ? { year, month } : { year, month: Number(today.slice(5, 7)) };
}

const monthParam = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

/** /gym — start/resume a workout, attendance calendar and counters. */
export function CalendarScreen() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const { year, month } = parseMonth(params.get('month'), today);
  const workouts = useLiveQuery(listAllWorkouts);
  const gymDays = useLiveQuery(listGymDays);
  const [selectedDay, setSelectedDay] = useState<LocalDate>();
  const [starting, setStarting] = useState(false);

  const attended = useMemo(
    () =>
      workouts &&
      gymDays &&
      attendedDates(
        workouts.map((w) => w.date),
        gymDays,
      ),
    [workouts, gymDays],
  );

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setParams({ month: monthParam(d.getFullYear(), d.getMonth() + 1) }, { replace: true });
  }

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr });

  return (
    <Screen title="Salle">
      <GymTabs />
      <ActiveOrStart onStart={() => setStarting(true)} />

      {attended === undefined || workouts === undefined || gymDays === undefined ? (
        <Loading />
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            <Counter
              label="Série en cours"
              value={`${weeklyStreak(attended, today)} sem.`}
              hint="semaines d’affilée avec au moins une séance"
            />
            <Counter
              label={`Séances en ${format(new Date(year, month - 1, 1), 'MMMM', { locale: fr })}`}
              value={String(sessionsInMonth(attended, year, month))}
            />
          </dl>

          <section className="mt-4 rounded-2xl bg-surface p-3" aria-label="Calendrier">
            <div className="mb-2 flex items-center">
              <button
                type="button"
                aria-label="Mois précédent"
                className={iconButton}
                onClick={() => shiftMonth(-1)}
              >
                <BackIcon />
              </button>
              <h2 className="flex-1 text-center font-semibold first-letter:uppercase">{monthLabel}</h2>
              <button
                type="button"
                aria-label="Mois suivant"
                className={iconButton}
                onClick={() => shiftMonth(1)}
              >
                <ForwardIcon />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted" aria-hidden="true">
              {WEEKDAYS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthGrid(year, month)
                .flat()
                .map((date, i) =>
                  date ? (
                    <DayCell
                      key={date}
                      date={date}
                      attended={attended.has(date)}
                      isToday={date === today}
                      isFuture={date > today}
                      onClick={() => setSelectedDay(date)}
                    />
                  ) : (
                    <span key={`blank-${i}`} />
                  ),
                )}
            </div>
          </section>
          <p className="mt-2 px-1 text-xs text-muted">Touche un jour pour voir sa séance ou le marquer.</p>
        </>
      )}

      <StartSheet open={starting} onClose={() => setStarting(false)} />
      <DaySheet
        date={selectedDay}
        workouts={workouts?.filter((w) => w.date === selectedDay) ?? []}
        manual={gymDays?.find((d) => d.date === selectedDay)?.attended ?? false}
        onClose={() => setSelectedDay(undefined)}
      />
    </Screen>
  );
}

function Counter({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="numeral text-3xl leading-none">{value}</dd>
      {hint && <dd className="text-[11px] leading-tight text-muted">{hint}</dd>}
    </div>
  );
}

interface DayCellProps {
  date: LocalDate;
  attended: boolean;
  isToday: boolean;
  isFuture: boolean;
  onClick: () => void;
}

function DayCell({ date, attended, isToday, isFuture, onClick }: DayCellProps) {
  const day = Number(date.slice(8));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${longDay(date)}${attended ? ', séance' : ''}`}
      aria-current={isToday ? 'date' : undefined}
      className={`flex aspect-square min-h-11 items-center justify-center rounded-xl text-sm font-semibold tabular-nums ${
        attended ? 'bg-accent-fill text-accent-fg' : isFuture ? 'text-muted' : 'text-fg active:bg-surface-2'
      } ${isToday ? 'ring-2 ring-fg ring-inset' : ''}`}
    >
      {day}
    </button>
  );
}

/** Resume card while a workout is active, else the start button. */
function ActiveOrStart({ onStart }: { onStart: () => void }) {
  const active = useLiveQuery(async () => (await getActiveWorkout()) ?? null);
  const sets = useLiveQuery(async () => (active ? getWorkoutSets(active.id) : []), [active?.id]);
  const now = useNow(30_000, Boolean(active));
  if (active === undefined) return <div className="h-12" />;
  if (active === null) {
    return (
      <Button className="w-full" onClick={onStart}>
        Commencer une séance
      </Button>
    );
  }
  const done = sets?.filter((s) => s.completed).length ?? 0;
  return (
    <Link
      to={`/gym/workout/${active.id}`}
      className="flex min-h-16 items-center gap-3 rounded-2xl bg-accent-fill px-4 py-3 text-accent-fg active:opacity-90"
    >
      <span className="size-2.5 animate-pulse rounded-full bg-accent-fg" aria-hidden="true" />
      <span className="flex-1">
        <span className="block font-semibold">{workoutTitle(active)}</span>
        <span className="block text-sm opacity-80">
          {formatDuration(now - active.startedAt)} · {done} série{done > 1 ? 's' : ''} validée
          {done > 1 ? 's' : ''}
        </span>
      </span>
      <span className="font-semibold">Reprendre</span>
    </Link>
  );
}

function StartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const templates = useLiveQuery(listTemplates);

  async function start(templateId?: number) {
    const id = await startWorkout(templateId);
    onClose();
    void navigate(`/gym/workout/${id}`);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Commencer une séance">
      <Button className="w-full" onClick={() => void start()}>
        Séance libre
      </Button>
      <h3 className="mt-5 mb-2 text-sm font-semibold text-muted">Depuis un modèle</h3>
      {templates === undefined ? null : templates.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun modèle pour l’instant.{' '}
          <Link to="/gym/templates/new" className="font-semibold text-accent" onClick={onClose}>
            Créer un modèle
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => void start(t.id)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left active:bg-surface-2"
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
    </BottomSheet>
  );
}

interface DaySheetProps {
  date: LocalDate | undefined;
  workouts: Workout[];
  /** Manual attendance flag for the day. */
  manual: boolean;
  onClose: () => void;
}

function DaySheet({ date, workouts, manual, onClose }: DaySheetProps) {
  const navigate = useNavigate();
  const today = useToday();
  const hasWorkout = workouts.length > 0;
  const attended = hasWorkout || manual;
  const isPastOrToday = date !== undefined && date <= today;

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

          {isPastOrToday && (
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={async () => {
                const id = await createPastWorkout(date);
                onClose();
                void navigate(`/gym/workout/${id}`);
              }}
            >
              Noter une séance ce jour-là
            </Button>
          )}
        </>
      )}
    </BottomSheet>
  );
}

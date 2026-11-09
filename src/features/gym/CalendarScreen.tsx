import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BackIcon, ForwardIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { iconButton, Screen } from '../../components/Screen';
import { useToday } from '../../components/useToday';
import { getWeeklyTarget, listGymDays } from '../../db/gymDays';
import { listUnloggedDays } from '../../db/nutritionDays';
import { listAllWorkouts } from '../../db/workouts';
import { formatMonthParam, parseMonthParam, shiftMonth, type LocalDate } from '../../domain/date';
import type { UnloggedStatus } from '../../domain/nutrition';
import { attendedDates, monthGrid, redDates, restDates, sessionsInMonth } from '../../domain/gymCalendar';
import { weekStreak } from '../../domain/streaks';
import { DaySheet } from './DaySheet';
import { GymTabs } from './shared';
import { ActiveOrStart, StartSheet } from './StartSheet';
import { longDay } from './workoutLabels';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** /gym — start/resume a workout, attendance calendar and counters. */
export function CalendarScreen() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const shown = parseMonthParam(params.get('month'), today);
  const { year, month } = shown;
  const workouts = useLiveQuery(listAllWorkouts);
  const gymDays = useLiveQuery(listGymDays);
  const unlogged = useLiveQuery(listUnloggedDays);
  const weeklyTarget = useLiveQuery(getWeeklyTarget);
  const [selectedDay, setSelectedDay] = useState<LocalDate>();
  // In the URL so "Commencer une séance" on the home screen can open the sheet directly.
  const starting = params.get('start') === '1';
  function setStarting(open: boolean) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (open) next.set('start', '1');
        else next.delete('start');
        return next;
      },
      { replace: true },
    );
  }

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
  const resting = useMemo(
    () =>
      workouts &&
      gymDays &&
      restDates(
        workouts.map((w) => w.date),
        gymDays,
      ),
    [workouts, gymDays],
  );

  const red = useMemo(
    () =>
      workouts &&
      unlogged &&
      redDates(
        workouts.map((w) => w.date),
        unlogged,
      ),
    [workouts, unlogged],
  );

  function goToMonth(delta: number) {
    setParams({ month: formatMonthParam(shiftMonth(shown, delta)) }, { replace: true });
  }

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr });
  const weeks = monthGrid(year, month);

  return (
    <Screen title="Salle" fit>
      <GymTabs />
      <ActiveOrStart onStart={() => setStarting(true)} />

      {attended === undefined ||
      resting === undefined ||
      red === undefined ||
      unlogged === undefined ||
      workouts === undefined ||
      gymDays === undefined ||
      weeklyTarget === undefined ? (
        <Loading />
      ) : (
        <>
          <dl className="mt-3 grid shrink-0 grid-cols-2 gap-2">
            <Counter
              label="Série en cours"
              value={`${weekStreak(attended, today, weeklyTarget).weeks} sem.`}
            />
            <Counter
              label={`Séances en ${format(new Date(year, month - 1, 1), 'MMMM', { locale: fr })}`}
              value={String(sessionsInMonth(attended, year, month))}
            />
          </dl>

          <section className="mt-3 flex min-h-0 flex-1 flex-col bg-surface p-3" aria-label="Calendrier">
            <div className="mb-1 flex shrink-0 items-center">
              <button
                type="button"
                aria-label="Mois précédent"
                className={iconButton}
                onClick={() => goToMonth(-1)}
              >
                <BackIcon />
              </button>
              <h2 className="flex-1 text-center font-semibold first-letter:uppercase">{monthLabel}</h2>
              <button
                type="button"
                aria-label="Mois suivant"
                className={iconButton}
                onClick={() => goToMonth(1)}
              >
                <ForwardIcon />
              </button>
            </div>
            <div
              className="grid shrink-0 grid-cols-7 gap-1 text-center text-xs text-muted"
              aria-hidden="true"
            >
              {WEEKDAYS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div
              className="mt-1 grid min-h-0 flex-1 grid-cols-7 gap-1"
              style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(2.75rem, 1fr))` }}
            >
              {weeks
                .flat()
                .map((date, i) =>
                  date ? (
                    <DayCell
                      key={date}
                      date={date}
                      attended={attended.has(date)}
                      rest={resting.has(date)}
                      red={red.has(date)}
                      nutrition={unlogged.get(date)}
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
        </>
      )}

      <StartSheet open={starting} onClose={() => setStarting(false)} />
      <DaySheet
        date={selectedDay}
        workouts={workouts?.filter((w) => w.date === selectedDay) ?? []}
        manual={gymDays?.find((d) => d.date === selectedDay)?.attended ?? false}
        rest={selectedDay !== undefined && (resting?.has(selectedDay) ?? false)}
        onClose={() => setSelectedDay(undefined)}
      />
    </Screen>
  );
}

function Counter({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-gym px-4 py-3 text-on-gym">
      <dt className="text-xs font-bold">{label}</dt>
      <dd className="mt-1 text-3xl leading-none numeral">{value}</dd>
      {hint && <dd className="mt-1 text-xs leading-tight font-bold">{hint}</dd>}
    </div>
  );
}

interface DayCellProps {
  date: LocalDate;
  attended: boolean;
  rest: boolean;
  red: boolean;
  /** Meals not counted that day: under or over the goal. */
  nutrition: UnloggedStatus | undefined;
  isToday: boolean;
  isFuture: boolean;
  onClick: () => void;
}

function DayCell({ date, attended, rest, red, nutrition, isToday, isFuture, onClick }: DayCellProps) {
  const day = Number(date.slice(8));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${longDay(date)}${attended ? ', séance' : rest ? ', repos' : red ? ', jour rouge' : ''}${
        nutrition === 'over'
          ? ', calories dépassées'
          : nutrition === 'under'
            ? ', sous l’objectif calories'
            : ''
      }`}
      aria-current={isToday ? 'date' : undefined}
      className={`relative flex h-full min-h-11 items-center justify-center text-sm font-semibold tabular-nums ${
        attended
          ? 'bg-gym text-on-gym'
          : red
            ? 'bg-red-day text-on-red-day'
            : rest
              ? 'bg-fg text-bg'
              : isFuture
                ? 'text-muted'
                : 'text-fg active:bg-surface-2'
      } ${isToday ? `ring-2 ring-inset ${rest && !attended && !red ? 'ring-bg' : 'ring-fg'}` : ''}`}
    >
      {day}
      {/* Meals not counted: ✓ stayed under the goal, ✗ went over (a red cell already says it). */}
      {(nutrition === 'under' || (nutrition === 'over' && attended)) && (
        <span
          aria-hidden="true"
          className={`absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center text-[10px] leading-none font-black ${
            nutrition === 'under' ? 'bg-paper text-ink' : 'bg-red-day text-on-red-day'
          }`}
        >
          {nutrition === 'under' ? '✓' : '✗'}
        </span>
      )}
    </button>
  );
}

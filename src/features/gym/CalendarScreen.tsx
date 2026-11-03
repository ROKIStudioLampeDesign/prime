import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BackIcon, ForwardIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { iconButton, Screen } from '../../components/Screen';
import { useToday } from '../../components/useToday';
import { listGymDays } from '../../db/gymDays';
import { listAllWorkouts } from '../../db/workouts';
import { formatMonthParam, parseMonthParam, shiftMonth, type LocalDate } from '../../domain/date';
import { attendedDates, monthGrid, sessionsInMonth, weeklyStreak } from '../../domain/gymCalendar';
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

  function goToMonth(delta: number) {
    setParams({ month: formatMonthParam(shiftMonth(shown, delta)) }, { replace: true });
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
    <div className="rounded-3xl bg-sky p-4 text-ink">
      <dt className="text-xs font-bold">{label}</dt>
      <dd className="mt-1 text-3xl leading-none numeral">{value}</dd>
      {hint && <dd className="mt-1 text-[11px] leading-tight font-semibold text-ink/75">{hint}</dd>}
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
        attended ? 'bg-sky text-ink' : isFuture ? 'text-muted' : 'text-fg active:bg-surface-2'
      } ${isToday ? 'ring-2 ring-fg ring-inset' : attended ? 'ring-1 ring-sky-strong ring-inset' : ''}`}
    >
      {day}
    </button>
  );
}

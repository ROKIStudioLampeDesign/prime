import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSearchParams } from 'react-router';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { BackIcon, ForwardIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { iconButton, Screen } from '../../components/Screen';
import { listBodyWeights } from '../../db/bodyWeights';
import { getGoals } from '../../db/goals';
import { listEntriesBetween, listWorkoutVolumesBetween } from '../../db/stats';
import { addDays, fromLocalDate, isLocalDate, todayLocalDate, type LocalDate } from '../../domain/date';
import { roundMacro } from '../../domain/nutrition';
import { weekEnd, weekStart } from '../../domain/week';
import {
  delta,
  kcalGoalMet,
  proteinGoalMet,
  weeklySummary,
  type DayNutrition,
} from '../../domain/weeklySummary';
import { formatMacro, formatVolume } from '../../lib/format';
import { axisProps, niceTicks } from './chartUtils';
import { signedKg } from './labels';
import { ChartEmpty, StatsTabs, StatTile } from './shared';

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CHART_HEIGHT = 130;

function weekLabel(start: LocalDate): string {
  const end = weekEnd(start);
  const s = fromLocalDate(start);
  const e = fromLocalDate(end);
  const sameMonth = s.getMonth() === e.getMonth();
  return `${format(s, sameMonth ? 'd' : 'd MMM', { locale: fr })} – ${format(e, 'd MMM yyyy', { locale: fr })}`;
}

/** /stats/week?week=YYYY-MM-DD — Monday-based weekly summary. */
export function WeekScreen() {
  const [params, setParams] = useSearchParams();
  const today = todayLocalDate();
  const raw = params.get('week');
  const start = weekStart(raw && isLocalDate(raw) ? raw : today);
  const prevStart = addDays(start, -7);
  const end = weekEnd(start);

  // Both weeks are loaded at once: the previous one gives the ▲/▼ deltas.
  const entries = useLiveQuery(() => listEntriesBetween(prevStart, end), [prevStart, end]);
  const workouts = useLiveQuery(() => listWorkoutVolumesBetween(prevStart, end), [prevStart, end]);
  const goals = useLiveQuery(getGoals);
  const weights = useLiveQuery(listBodyWeights);
  const isCurrent = start === weekStart(today);

  const go = (date: LocalDate) =>
    setParams(date === weekStart(today) ? {} : { week: date }, { replace: true });

  return (
    <Screen title="Stats">
      <StatsTabs />
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          aria-label="Semaine précédente"
          className={iconButton}
          onClick={() => go(prevStart)}
        >
          <BackIcon />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold">{isCurrent ? 'Cette semaine' : weekLabel(start)}</p>
          {isCurrent && <p className="text-xs text-muted">{weekLabel(start)}</p>}
        </div>
        <button
          type="button"
          aria-label="Semaine suivante"
          className={`${iconButton} disabled:opacity-30`}
          disabled={isCurrent}
          onClick={() => go(addDays(start, 7))}
        >
          <ForwardIcon />
        </button>
      </div>

      {entries === undefined || workouts === undefined || goals === undefined || weights === undefined ? (
        <Loading />
      ) : (
        (() => {
          const input = { foodEntries: entries, workouts, goals, weights };
          const week = weeklySummary({ ...input, weekOf: start });
          const previous = weeklySummary({ ...input, weekOf: prevStart });
          const sessions = delta(week.workoutCount, previous.workoutCount);
          const arrow = sessions.direction === 'up' ? '▲' : sessions.direction === 'down' ? '▼' : '=';
          const logged = week.loggedDays;
          return (
            <>
              <dl className="grid grid-cols-2 gap-2">
                <StatTile
                  label="Séances"
                  value={week.workoutCount}
                  hint={
                    <span
                      className={
                        sessions.direction === 'down'
                          ? 'text-danger'
                          : sessions.direction === 'up'
                            ? 'text-accent'
                            : ''
                      }
                    >
                      {arrow} {sessions.direction === 'same' ? 'comme' : `${Math.abs(sessions.value)} vs`}{' '}
                      sem. préc.
                    </span>
                  }
                />
                <StatTile label="Volume total" value={formatVolume(week.volumeKg)} />
                <StatTile
                  label="Calories moy."
                  value={week.avgKcal === undefined ? '—' : `${formatMacro('kcal', week.avgKcal)} kcal`}
                  hint={`${logged} jour${logged > 1 ? 's' : ''} renseigné${logged > 1 ? 's' : ''}`}
                />
                <StatTile
                  label="Protéines moy."
                  value={week.avgProtein === undefined ? '—' : `${formatMacro('protein', week.avgProtein)} g`}
                  hint={`${logged} jour${logged > 1 ? 's' : ''} renseigné${logged > 1 ? 's' : ''}`}
                />
                <StatTile
                  label="Objectifs atteints"
                  value={
                    week.kcalGoalDays === undefined && week.proteinGoalDays === undefined
                      ? '—'
                      : `${week.kcalGoalDays ?? '–'} · ${week.proteinGoalDays ?? '–'}`
                  }
                  hint={
                    week.kcalGoalDays === undefined && week.proteinGoalDays === undefined
                      ? 'aucun objectif défini'
                      : `jours kcal · protéines, sur ${logged}`
                  }
                />
                <StatTile
                  label="Poids"
                  value={week.weightChange === undefined ? '—' : signedKg(week.weightChange)}
                  hint={week.weightChange === undefined ? 'aucune pesée' : 'sur la semaine'}
                />
              </dl>

              <DailyChart
                title="Calories par jour"
                unit="kcal"
                days={week.days}
                value={(d) => roundMacro('kcal', d.kcal)}
                goal={goals.kcal}
                met={(d) => goals.kcal !== undefined && kcalGoalMet(d.kcal, goals.kcal)}
              />
              <DailyChart
                title="Protéines par jour"
                unit="g"
                days={week.days}
                value={(d) => roundMacro('protein', d.protein)}
                goal={goals.protein}
                met={(d) => goals.protein !== undefined && proteinGoalMet(d.protein, goals.protein)}
              />
              <p className="mt-2 px-1 text-xs text-muted">
                Moyennes calculées sur les jours renseignés seulement. Objectif calories atteint à ±10 %.
              </p>
            </>
          );
        })()
      )}
    </Screen>
  );
}

interface DailyChartProps {
  title: string;
  unit: string;
  days: DayNutrition[];
  value: (day: DayNutrition) => number;
  goal?: number;
  met: (day: DayNutrition) => boolean;
}

/** Mini bar chart of a week: bright bars when the goal is met, dimmed otherwise, dashed goal line. */
function DailyChart({ title, unit, days, value, goal, met }: DailyChartProps) {
  const data = days.map((d, i) => ({ label: DAY_LETTERS[i] ?? '', value: d.logged ? value(d) : 0, day: d }));
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value));
  const yTicks = niceTicks(0, max * 1.05, 3);
  return (
    <section className="mt-3 rounded-2xl bg-surface p-3 pb-1" aria-label={title}>
      <h2 className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold">{title}</span>
        {goal !== undefined && (
          <span className="text-xs text-muted">
            objectif {formatMacro(unit === 'kcal' ? 'kcal' : 'protein', goal)} {unit}
          </span>
        )}
      </h2>
      {days.every((d) => !d.logged) ? (
        <ChartEmpty height={CHART_HEIGHT} />
      ) : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <XAxis {...axisProps} dataKey="label" interval={0} />
            <YAxis {...axisProps} width={36} domain={[0, yTicks.at(-1) ?? 1]} ticks={yTicks} />
            {goal !== undefined && (
              <ReferenceLine y={goal} stroke="var(--color-fg)" strokeOpacity={0.5} strokeDasharray="4 4" />
            )}
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={28}>
              {data.map((d) => (
                <Cell
                  key={d.day.date}
                  fill="var(--color-accent)"
                  fillOpacity={goal === undefined || met(d.day) ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

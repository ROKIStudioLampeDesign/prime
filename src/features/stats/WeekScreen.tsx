import { useLiveQuery } from 'dexie-react-hooks';
import { useToday } from '../../components/useToday';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSearchParams } from 'react-router';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { BackIcon, ForwardIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { headerButton, Screen } from '../../components/Screen';
import { listBodyWeights } from '../../db/bodyWeights';
import { getGoals } from '../../db/goals';
import { listGymDays } from '../../db/gymDays';
import { listAllWorkouts } from '../../db/workouts';
import { redDates } from '../../domain/gymCalendar';
import { listEntriesBetween, listWorkoutVolumesBetween } from '../../db/stats';
import { addDays, fromLocalDate, isLocalDate, type LocalDate } from '../../domain/date';
import { roundMacro } from '../../domain/nutrition';
import { weekEnd, weekStart } from '../../domain/week';
import {
  delta,
  kcalGoalMet,
  proteinGoalMet,
  weeklySummary,
  type DayNutrition,
} from '../../domain/weeklySummary';
import { formatInteger, formatMacro, formatWeightChange } from '../../lib/format';
import { axisProps, niceTicks } from './chartUtils';
import { BandTile, ChartEmpty, StatsTabs } from './shared';

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
  const today = useToday();
  const raw = params.get('week');
  const start = weekStart(raw && isLocalDate(raw) ? raw : today);
  const prevStart = addDays(start, -7);
  const end = weekEnd(start);

  // Both weeks are loaded at once: the previous one gives the ▲/▼ deltas.
  const entries = useLiveQuery(() => listEntriesBetween(prevStart, end), [prevStart, end]);
  const workouts = useLiveQuery(() => listWorkoutVolumesBetween(prevStart, end), [prevStart, end]);
  const goals = useLiveQuery(getGoals);
  const weights = useLiveQuery(listBodyWeights);
  const redDays = useLiveQuery(async () => {
    const [all, gymDays] = await Promise.all([listAllWorkouts(), listGymDays()]);
    return redDates(
      all.map((w) => w.date),
      gymDays,
    );
  });
  const isCurrent = start === weekStart(today);

  const go = (date: LocalDate) =>
    setParams(date === weekStart(today) ? {} : { week: date }, { replace: true });

  return (
    <Screen title="Stats">
      <StatsTabs />
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="Semaine précédente"
          className={headerButton}
          onClick={() => go(prevStart)}
        >
          <BackIcon />
        </button>
        <div className="flex-1 text-center">
          <p className="text-lg leading-tight headline">{isCurrent ? 'Cette semaine' : weekLabel(start)}</p>
          {isCurrent && <p className="text-[13px] font-bold text-muted">{weekLabel(start)}</p>}
        </div>
        <button
          type="button"
          aria-label="Semaine suivante"
          className={`${headerButton} disabled:opacity-30`}
          disabled={isCurrent}
          onClick={() => go(addDays(start, 7))}
        >
          <ForwardIcon />
        </button>
      </div>

      {entries === undefined ||
      workouts === undefined ||
      goals === undefined ||
      weights === undefined ||
      redDays === undefined ? (
        <Loading />
      ) : (
        (() => {
          const input = { foodEntries: entries, workouts, goals, weights, today, redDays };
          const week = weeklySummary({ ...input, weekOf: start });
          const previous = weeklySummary({ ...input, weekOf: prevStart });
          const sessions = delta(week.workoutCount, previous.workoutCount);
          const arrow = sessions.direction === 'up' ? '▲' : sessions.direction === 'down' ? '▼' : '=';
          const logged = week.loggedDays;
          return (
            <>
              {/* Domain cells edge to edge: Salle cobalt, calories yellow, the rest paper. */}
              <dl className="edge grid grid-cols-2 gap-0.5">
                <BandTile
                  tone="gym"
                  label="Séances"
                  value={String(week.workoutCount)}
                  maxRem={3.75}
                  hint={`${arrow} ${sessions.direction === 'same' ? 'comme' : `${Math.abs(sessions.value)} vs`} sem. préc.`}
                />
                <BandTile tone="gym" label="Volume total" value={formatInteger(week.volumeKg)} unit="kg" />
                <BandTile
                  tone="nutrition"
                  className="col-span-2"
                  label="Calories, moyenne"
                  value={week.avgKcal === undefined ? '—' : formatMacro('kcal', week.avgKcal)}
                  unit={week.avgKcal === undefined ? undefined : 'kcal / jour'}
                  maxRem={4.5}
                  hint={`${logged} jour${logged > 1 ? 's' : ''} renseigné${logged > 1 ? 's' : ''}${
                    week.redDays > 0
                      ? ` · ${week.redDays} jour${week.redDays > 1 ? 's' : ''} rouge${week.redDays > 1 ? 's' : ''}`
                      : ''
                  }`}
                />
                <BandTile
                  tone="paper"
                  label="Protéines moy."
                  value={week.avgProtein === undefined ? '—' : formatMacro('protein', week.avgProtein)}
                  unit={week.avgProtein === undefined ? undefined : 'g'}
                  hint={`${logged} jour${logged > 1 ? 's' : ''} renseigné${logged > 1 ? 's' : ''}`}
                />
                <BandTile
                  tone="paper"
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
                <BandTile
                  tone="paper"
                  className="col-span-2"
                  label="Poids"
                  value={week.weightChange === undefined ? '—' : formatWeightChange(week.weightChange)}
                  unit={week.weightChange === undefined ? undefined : 'kg'}
                  hint={week.weightChange === undefined ? 'aucune pesée' : 'sur la semaine'}
                />
              </dl>

              <DailyChart
                title="Calories par jour"
                color="var(--color-nutrition-strong)"
                unit="kcal"
                days={week.days}
                value={(d) => roundMacro('kcal', d.kcal)}
                goal={goals.kcal}
                met={(d) => goals.kcal !== undefined && kcalGoalMet(d.kcal, goals.kcal)}
              />
              <DailyChart
                title="Protéines par jour"
                color="var(--color-paper-strong)"
                unit="g"
                days={week.days}
                value={(d) => roundMacro('protein', d.protein)}
                goal={goals.protein}
                met={(d) => goals.protein !== undefined && proteinGoalMet(d.protein, goals.protein)}
              />
              <p className="mt-3 text-xs font-semibold text-muted">
                Moyennes calculées sur les jours renseignés seulement, sans la journée en cours ni les jours
                rouges (barres rouges). Calories : objectif atteint juste en dessous (90 à 100 %), raté
                au-dessus. Protéines : atteint dès 95 %.
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
  /** Domain colour of the bars (a `--color-*-strong` token). */
  color: string;
  unit: string;
  days: DayNutrition[];
  value: (day: DayNutrition) => number;
  goal?: number;
  met: (day: DayNutrition) => boolean;
}

/** Mini bar chart of a week: bright bars when the goal is met, dimmed otherwise, dashed goal line. */
function DailyChart({ title, color, unit, days, value, goal, met }: DailyChartProps) {
  const values = days.map((d) => (d.logged ? value(d) : 0));
  const max = Math.max(goal ?? 0, ...values);
  const yTicks = niceTicks(0, max * 1.05, 3);
  // A jour rouge has no meaningful total: a full-height red bar marks it instead.
  const data = days.map((d, i) => ({
    label: DAY_LETTERS[i] ?? '',
    value: d.red ? (yTicks.at(-1) ?? max) : (values[i] ?? 0),
    day: d,
  }));
  return (
    <section className="mt-5" aria-label={title}>
      <h2 className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-lg leading-tight headline">{title}</span>
        {goal !== undefined && (
          <span className="text-xs font-bold text-muted">
            objectif {formatMacro(unit === 'kcal' ? 'kcal' : 'protein', goal)} {unit}
          </span>
        )}
      </h2>
      {days.every((d) => !d.logged && !d.red) ? (
        <ChartEmpty height={CHART_HEIGHT} />
      ) : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <XAxis {...axisProps} dataKey="label" interval={0} />
            <YAxis {...axisProps} width={36} domain={[0, yTicks.at(-1) ?? 1]} ticks={yTicks} />
            {goal !== undefined && (
              <ReferenceLine y={goal} stroke="var(--color-fg)" strokeOpacity={0.5} strokeDasharray="4 4" />
            )}
            <Bar dataKey="value" isAnimationActive={false} maxBarSize={28}>
              {data.map((d) => (
                <Cell
                  key={d.day.date}
                  fill={d.day.red ? 'var(--color-red-day)' : color}
                  fillOpacity={d.day.red || goal === undefined || met(d.day) ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

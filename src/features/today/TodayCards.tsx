import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { BigNumber } from '../../components/BigNumber';
import { ForwardIcon } from '../../components/icons';
import { ProgressBar } from '../../components/Progress';
import { useNow } from '../../components/useNow';
import { listBodyWeights } from '../../db/bodyWeights';
import type { Workout } from '../../db/db';
import { getGoals } from '../../db/goals';
import { getGymDay, setRestDay } from '../../db/gymDays';
import { listEntriesForDate } from '../../db/logEntries';
import { getStreaks } from '../../db/streaks';
import { getWorkoutSets, listAllWorkouts } from '../../db/workouts';
import type { LocalDate } from '../../domain/date';
import { GOAL_KINDS, goalProgress, sumMacros } from '../../domain/nutrition';
import { todayWeight, todayWorkouts } from '../../domain/today';
import { workoutStats } from '../../domain/workout';
import {
  formatDuration,
  formatMacro,
  formatSignedBodyWeight,
  formatVolume,
  formatWeight,
} from '../../lib/format';

/*
 * The home screen stacks full-width bands with no gaps: Alimentation yellow, then a paper row
 * shared by protéines and poids, then Salle cobalt. Text on yellow and paper is ink (secondary
 * ink/72); text on cobalt is on-gym.
 */
const band = 'bleed flex flex-col justify-between gap-2 py-3.5 focus-inset @container';
const bandLabel = 'text-sm font-extrabold';
const cellLabel = 'text-[13px] font-extrabold';
/** A cell of a two-column row: label on top, figure at the bottom. */
const cell = '@container flex flex-col justify-between gap-1 focus-inset';

/** Reserves a band's place while its data loads, so the page doesn't jump. */
function Placeholder({ label, className }: { label: string; className: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label} : chargement…</span>
    </div>
  );
}

const agoLabel = (days: number) => (days <= 0 ? 'aujourd’hui' : days === 1 ? 'hier' : `il y a ${days} jours`);
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

function useDayNutrition(today: LocalDate) {
  return useLiveQuery(async () => {
    const entries = await listEntriesForDate(today);
    return {
      count: entries.length,
      totals: sumMacros(entries.map((e) => e.macros)),
      goals: await getGoals(),
    };
  }, [today]);
}

/** The yellow band: today's energy against the goal. */
export function NutritionCard({ today }: { today: LocalDate }) {
  const data = useDayNutrition(today);
  if (!data) return <Placeholder label="Calories" className="bleed h-48 grow-[3] bg-nutrition" />;

  const goal = data.goals.kcal;
  const kcal = goal === undefined ? undefined : goalProgress(data.totals.kcal, goal, GOAL_KINDS.kcal);
  let caption = 'kcal · aucun objectif défini';
  if (data.count === 0) caption = 'Rien de noté pour l’instant : ajoute ton premier repas.';
  else if (goal !== undefined && kcal) {
    const target = `sur ${formatMacro('kcal', goal)} kcal`;
    if (kcal.remaining > 0) caption = `${target} · reste ${formatMacro('kcal', kcal.remaining)}`;
    else
      caption = kcal.bad
        ? `${target} · ${formatMacro('kcal', -kcal.remaining)} en trop`
        : `${target} · objectif atteint`;
  }

  return (
    <Link to="/nutrition" className={`${band} grow-[3] bg-nutrition text-ink active:opacity-90`}>
      <h2 className={`flex items-center justify-between ${bandLabel}`}>
        Calories du jour
        <ForwardIcon className="size-5" />
      </h2>
      <div>
        <BigNumber value={formatMacro('kcal', data.totals.kcal)} maxRem={5.5} className="leading-[0.82]" />
        <p className={`mt-1.5 text-[15px] font-bold tabular-nums ${kcal?.bad ? 'text-danger-ink' : ''}`}>
          {caption}
        </p>
        {kcal && (
          <div className="mt-2 [&>div]:h-2.5">
            <ProgressBar ratio={kcal.ratio} tone={kcal.bad ? 'danger-ink' : 'ink'} />
          </div>
        )}
      </div>
    </Link>
  );
}

/** Left half of the paper row. */
export function ProteinCard({ today }: { today: LocalDate }) {
  const data = useDayNutrition(today);
  if (!data) return <Placeholder label="Protéines" className="h-32 border-r-2 border-ink" />;
  const goal = data.goals.protein;

  return (
    <Link to="/nutrition" className={`${cell} border-r-2 border-ink py-3 pr-4 active:opacity-70`}>
      <h2 className={cellLabel}>Protéines</h2>
      <div>
        <BigNumber
          value={formatMacro('protein', data.totals.protein)}
          maxRem={2.5}
          className="leading-[0.9]"
        />
        <p className="mt-1 text-sm font-bold text-ink/72 tabular-nums">
          {goal === undefined ? 'g' : `sur ${formatMacro('protein', goal)} g`}
        </p>
      </div>
    </Link>
  );
}

/** Right half of the paper row. */
export function WeightCard({ today }: { today: LocalDate }) {
  const entries = useLiveQuery(listBodyWeights);
  if (!entries) return <Placeholder label="Poids" className="h-32" />;
  const { latest, isToday, daysAgo, change } = todayWeight(entries, today);

  return (
    <Link to="/stats" className={`${cell} py-3 pl-4 active:opacity-70`}>
      <h2 className={cellLabel}>Poids</h2>
      {latest && daysAgo !== undefined ? (
        <div>
          <BigNumber value={formatWeight(latest.kg)} maxRem={2.5} unit="kg" className="leading-[0.9]" />
          <p className="mt-1 truncate text-sm font-bold text-ink/72 tabular-nums">
            {change
              ? `${formatSignedBodyWeight(change.kg)} en ${change.days} jours`
              : isToday
                ? 'Pesée du jour'
                : `Pesée ${agoLabel(daysAgo)}`}
          </p>
        </div>
      ) : (
        <p className="text-sm font-bold text-ink/72">Aucune pesée pour l’instant.</p>
      )}
    </Link>
  );
}

/**
 * The streaks row: days in a row at or under the calorie goal, and weeks in a row with the
 * weekly number of gym days (set in Réglages).
 */
export function StreaksCard({ today }: { today: LocalDate }) {
  const streaks = useLiveQuery(() => getStreaks(today), [today]);
  if (!streaks) return <Placeholder label="Séries" className="bleed h-28 grow-[2] border-b border-line" />;
  const { calories, week } = streaks;

  return (
    <section aria-label="Séries" className="bleed grid grow-[2] grid-cols-2 border-b border-line">
      <Link to="/nutrition" className={`${cell} border-r border-line py-3 pr-4 active:opacity-70`}>
        <h2 className={cellLabel}>
          {calories ? `Sous ${formatMacro('kcal', calories.goal)} kcal` : 'Calories'}
        </h2>
        {calories ? (
          <div>
            <BigNumber
              value={String(calories.days)}
              maxRem={2.5}
              unit={calories.days > 1 ? 'jours' : 'jour'}
              className="leading-[0.9]"
            />
            {calories.today !== 'ok' && (
              <p
                className={`mt-1 text-[13px] font-semibold ${calories.today === 'over' ? 'text-danger' : 'text-muted'}`}
              >
                {calories.today === 'over' ? 'Objectif dépassé aujourd’hui.' : 'Note tes repas du jour.'}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold text-muted">Fixe un objectif calories dans Réglages.</p>
        )}
      </Link>
      <Link to="/gym" className={`${cell} py-3 pl-4 active:opacity-70`}>
        <h2 className={cellLabel}>Semaines à {week.target} séances</h2>
        <div>
          <BigNumber
            value={String(week.weeks)}
            maxRem={2.5}
            unit={week.weeks > 1 ? 'semaines' : 'semaine'}
            className="leading-[0.9]"
          />
          <p className="mt-1 text-[13px] font-semibold text-muted tabular-nums">
            {Math.min(week.thisWeek, 7)} / {week.target} cette semaine
          </p>
        </div>
      </Link>
    </section>
  );
}

function WorkoutLine({ workout, now }: { workout: Workout; now?: number }) {
  const sets = useLiveQuery(() => getWorkoutSets(workout.id), [workout.id]);
  if (!sets) return <p className="text-[15px] font-semibold">…</p>;
  const stats = workoutStats(workout, sets, now);
  const parts = [
    stats.durationMs !== undefined && formatDuration(stats.durationMs),
    plural(stats.completedSets, 'série'),
    stats.volumeKg > 0 && formatVolume(stats.volumeKg),
  ];
  return <p className="text-[15px] font-semibold tabular-nums">{parts.filter(Boolean).join(' · ')}</p>;
}

const gymBand = `${band} grow-[2] bg-gym text-on-gym`;
const gymButton =
  'mt-3 flex min-h-12 items-center justify-center bg-accent-fill px-4 text-base font-black text-accent-fg [font-stretch:112%] focus-inset active:opacity-80';
/** Secondary action on the cobalt band: outlined, so the yellow button stays the main one. */
const gymSecondaryButton =
  'mt-3 flex min-h-12 items-center justify-center border-2 border-on-gym px-4 text-[15px] font-extrabold focus-inset active:opacity-70';

function ActiveWorkoutCard({ workout }: { workout: Workout }) {
  const now = useNow(30_000);
  return (
    <Link to={`/gym/workout/${workout.id}`} className={`${gymBand} active:opacity-90`}>
      <h2 className={bandLabel}>Salle</h2>
      <div>
        <p className="flex items-center gap-2.5 text-[1.5rem] leading-tight headline">
          <span className="size-3 shrink-0 animate-pulse bg-on-gym" aria-hidden="true" />
          <span className="truncate">{workout.name ?? 'Séance en cours'}</span>
        </p>
        <WorkoutLine workout={workout} now={now} />
        <span className={gymButton}>Reprendre</span>
      </div>
    </Link>
  );
}

/** The cobalt band, last so its button stays within thumb reach. */
export function GymCard({ today }: { today: LocalDate }) {
  const workouts = useLiveQuery(listAllWorkouts);
  // `null` (not undefined) when the day has no mark, so loading stays distinguishable.
  const gymDay = useLiveQuery(async () => (await getGymDay(today)) ?? null, [today]);
  if (!workouts || gymDay === undefined)
    return <Placeholder label="Salle" className="bleed h-40 grow-[2] bg-gym" />;
  const state = todayWorkouts(workouts, today);

  if (state.kind === 'active') return <ActiveWorkoutCard workout={state.workout} />;

  if (state.kind === 'done') {
    return (
      <section aria-labelledby="today-gym" className={gymBand}>
        <h2 id="today-gym" className={bandLabel}>
          Salle
        </h2>
        <ul>
          {state.workouts.map((w) => (
            <li key={w.id} className="border-t-2 border-on-gym">
              <Link
                to={`/gym/workout/${w.id}/summary`}
                className="flex min-h-14 items-center gap-2 py-1.5 focus-inset active:opacity-70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xl leading-tight headline">
                    {w.name ?? 'Séance du jour'}
                  </span>
                  <WorkoutLine workout={w} />
                </span>
                <ForwardIcon className="size-5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (gymDay?.rest === true) {
    return (
      <section aria-labelledby="today-gym" className={gymBand}>
        <h2 id="today-gym" className={bandLabel}>
          Salle
        </h2>
        <div>
          <p className="text-[1.5rem] leading-[1.05] headline">Jour de repos</p>
          <p className="mt-1 text-[15px] font-semibold">
            Tes muscles récupèrent. Continue de noter tes repas.
          </p>
          <button
            type="button"
            className={`${gymSecondaryButton} w-full`}
            onClick={() => void setRestDay(today, false)}
          >
            Annuler le jour de repos
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="today-gym" className={gymBand}>
      <h2 id="today-gym" className={bandLabel}>
        Salle
      </h2>
      <div>
        <p className="text-[1.5rem] leading-[1.05] headline">Pas de séance aujourd’hui</p>
        <p className="mt-1.5 text-[15px] font-semibold">
          {state.last
            ? `Dernière séance ${agoLabel(state.last.daysAgo)}.`
            : 'Ta première séance apparaîtra ici.'}
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link to="/gym?start=1" className={gymButton}>
            Commencer une séance
          </Link>
          <button type="button" className={gymSecondaryButton} onClick={() => void setRestDay(today, true)}>
            Jour de repos
          </button>
        </div>
      </div>
    </section>
  );
}

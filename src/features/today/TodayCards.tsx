import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ForwardIcon } from '../../components/icons';
import { ProgressBar } from '../../components/Progress';
import { useNow } from '../../components/useNow';
import { listBodyWeights } from '../../db/bodyWeights';
import type { Workout } from '../../db/db';
import { getGoals } from '../../db/goals';
import { listEntriesForDate } from '../../db/logEntries';
import { getWorkoutSets, listAllWorkouts } from '../../db/workouts';
import type { LocalDate } from '../../domain/date';
import { GOAL_KINDS, goalProgress, sumMacros } from '../../domain/nutrition';
import { todayWeight, todayWorkouts } from '../../domain/today';
import { workoutStats } from '../../domain/workout';
import { formatDuration, formatMacro, formatVolume, formatWeight } from '../../lib/format';

/** Reserves a card's height while its data loads, so the page doesn't jump. */
function CardPlaceholder({ label }: { label: string }) {
  return <div className="h-32 rounded-2xl bg-surface" aria-busy="true" aria-label={label} />;
}

function CardLink({ to, title, children }: { to: string; title: string; children: ReactNode }) {
  return (
    <Link to={to} className="block rounded-2xl bg-surface p-4 active:bg-surface-2">
      <h2 className="flex items-center justify-between text-sm font-semibold text-muted">
        {title}
        <ForwardIcon className="size-4" />
      </h2>
      {children}
    </Link>
  );
}

const agoLabel = (days: number) => (days <= 0 ? 'aujourd’hui' : days === 1 ? 'hier' : `il y a ${days} jours`);
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function NutritionCard({ today }: { today: LocalDate }) {
  const data = useLiveQuery(
    async () => ({ entries: await listEntriesForDate(today), goals: await getGoals() }),
    [today],
  );
  if (!data) return <CardPlaceholder label="Alimentation" />;

  const totals = sumMacros(data.entries.map((e) => e.macros));
  const { kcal: kcalGoal, protein: proteinGoal } = data.goals;
  const kcal = kcalGoal === undefined ? undefined : goalProgress(totals.kcal, kcalGoal, GOAL_KINDS.kcal);

  return (
    <CardLink to="/nutrition" title="Alimentation">
      <p className="mt-2 flex items-baseline gap-2">
        <span className="numeral text-5xl leading-none">{formatMacro('kcal', totals.kcal)}</span>
        <span className="text-sm text-muted tabular-nums">
          {kcalGoal === undefined ? 'kcal' : `/ ${formatMacro('kcal', kcalGoal)} kcal`}
        </span>
      </p>
      {kcal && (
        <div className="mt-3">
          <ProgressBar ratio={kcal.ratio} tone={kcal.bad ? 'danger' : 'accent'} />
        </div>
      )}
      <p className="mt-2 text-sm text-muted tabular-nums">
        {data.entries.length === 0
          ? 'Rien de noté pour l’instant : ajoute ton premier repas.'
          : [
              kcal &&
                (kcal.remaining > 0
                  ? `Reste ${formatMacro('kcal', kcal.remaining)} kcal`
                  : kcal.bad
                    ? `${formatMacro('kcal', -kcal.remaining)} kcal en trop`
                    : 'Objectif atteint'),
              `Protéines ${formatMacro('protein', totals.protein)}${
                proteinGoal === undefined ? '' : ` / ${formatMacro('protein', proteinGoal)}`
              } g`,
            ]
              .filter(Boolean)
              .join(' · ')}
      </p>
    </CardLink>
  );
}

function WorkoutLine({ workout, now }: { workout: Workout; now?: number }) {
  const sets = useLiveQuery(() => getWorkoutSets(workout.id), [workout.id]);
  if (!sets) return <p className="text-sm opacity-80">…</p>;
  const stats = workoutStats(workout, sets, now);
  const parts = [
    stats.durationMs !== undefined && formatDuration(stats.durationMs),
    plural(stats.completedSets, 'série'),
    stats.volumeKg > 0 && formatVolume(stats.volumeKg),
  ];
  return <p className="text-sm tabular-nums opacity-80">{parts.filter(Boolean).join(' · ')}</p>;
}

function ActiveWorkoutCard({ workout }: { workout: Workout }) {
  const now = useNow(30_000);
  return (
    <Link
      to={`/gym/workout/${workout.id}`}
      className="flex min-h-20 items-center gap-3 rounded-2xl bg-accent-fill p-4 text-accent-fg active:opacity-90"
    >
      <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-accent-fg" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{workout.name ?? 'Séance en cours'}</span>
        <WorkoutLine workout={workout} now={now} />
      </span>
      <span className="font-semibold">Reprendre</span>
    </Link>
  );
}

export function GymCard({ today }: { today: LocalDate }) {
  const workouts = useLiveQuery(listAllWorkouts);
  if (!workouts) return <CardPlaceholder label="Salle" />;
  const state = todayWorkouts(workouts, today);

  if (state.kind === 'active') return <ActiveWorkoutCard workout={state.workout} />;

  if (state.kind === 'done') {
    return (
      <section aria-labelledby="today-gym" className="rounded-2xl bg-surface p-4">
        <h2 id="today-gym" className="text-sm font-semibold text-muted">
          Salle
        </h2>
        <ul className="mt-1 divide-y divide-line">
          {state.workouts.map((w) => (
            <li key={w.id}>
              <Link
                to={`/gym/workout/${w.id}/summary`}
                className="-mx-2 flex min-h-14 items-center gap-2 rounded-xl px-2 active:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{w.name ?? 'Séance du jour'}</span>
                  <WorkoutLine workout={w} />
                </span>
                <ForwardIcon className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="today-gym" className="rounded-2xl bg-surface p-4">
      <h2 id="today-gym" className="text-sm font-semibold text-muted">
        Salle
      </h2>
      <p className="mt-1 font-semibold">Pas de séance aujourd’hui</p>
      <p className="text-sm text-muted">
        {state.last
          ? `Dernière séance ${agoLabel(state.last.daysAgo)}.`
          : 'Ta première séance apparaîtra ici.'}
      </p>
      <Link
        to="/gym"
        className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-accent-fill px-4 font-semibold text-accent-fg active:opacity-80"
      >
        Commencer une séance
      </Link>
    </section>
  );
}

export function WeightCard({ today }: { today: LocalDate }) {
  const entries = useLiveQuery(listBodyWeights);
  if (!entries) return <CardPlaceholder label="Poids" />;
  const { latest, isToday, daysAgo, weekChange } = todayWeight(entries, today);

  return (
    <CardLink to="/stats" title="Poids">
      {latest && daysAgo !== undefined ? (
        <>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="numeral text-5xl leading-none">{formatWeight(latest.kg)}</span>
            <span className="text-sm text-muted">kg</span>
            {weekChange !== undefined && (
              <span className="ml-auto text-sm text-muted tabular-nums">
                {weekChange > 0 ? '+' : weekChange < 0 ? '−' : '±'}
                {formatWeight(Math.abs(Math.round(weekChange * 10) / 10))} kg en 7 jours
              </span>
            )}
          </p>
          <p className="mt-2 text-sm text-muted">
            {isToday ? 'Pesée du jour enregistrée.' : `Dernière pesée ${agoLabel(daysAgo)} : pèse-toi.`}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">Aucune pesée : note ton poids pour suivre ta courbe.</p>
      )}
    </CardLink>
  );
}

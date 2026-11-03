import { useLiveQuery } from 'dexie-react-hooks';
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
import { GOAL_KINDS, goalProgress, sumMacros, type GoalProgress } from '../../domain/nutrition';
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
 * The home screen is a bento grid of domain tiles (two columns): Alimentation peach (wide),
 * protéines lilac, poids mint, Salle sky (wide). Text on a tile is ink, secondary ink/75.
 */
const tile = 'block rounded-3xl p-5 text-ink';
const wide = 'col-span-2';

/** Reserves a tile's place while its data loads, so the grid doesn't jump. */
function TilePlaceholder({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div role="status" className={`h-36 rounded-3xl bg-surface ${className}`}>
      <span className="sr-only">{label} : chargement…</span>
    </div>
  );
}

function TileTitle({ title, link = false }: { title: string; link?: boolean }) {
  return (
    <h2 className="flex items-center justify-between text-[15px] font-bold">
      {title}
      {link && <ForwardIcon className="size-[18px]" />}
    </h2>
  );
}

const agoLabel = (days: number) => (days <= 0 ? 'aujourd’hui' : days === 1 ? 'hier' : `il y a ${days} jours`);
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

function kcalCaption(kcal: GoalProgress | undefined): string {
  if (!kcal) return 'Aucun objectif défini.';
  if (kcal.remaining > 0) return `Reste ${formatMacro('kcal', kcal.remaining)} kcal`;
  return kcal.bad ? `${formatMacro('kcal', -kcal.remaining)} kcal en trop` : 'Objectif atteint';
}

/** Two tiles: energy (wide) and protein. */
export function NutritionCard({ today }: { today: LocalDate }) {
  const data = useLiveQuery(
    async () => ({ entries: await listEntriesForDate(today), goals: await getGoals() }),
    [today],
  );
  if (!data) {
    return (
      <>
        <TilePlaceholder label="Alimentation" className={wide} />
        <TilePlaceholder label="Protéines" />
      </>
    );
  }

  const totals = sumMacros(data.entries.map((e) => e.macros));
  const { kcal: kcalGoal, protein: proteinGoal } = data.goals;
  const kcal = kcalGoal === undefined ? undefined : goalProgress(totals.kcal, kcalGoal, GOAL_KINDS.kcal);
  const protein =
    proteinGoal === undefined ? undefined : goalProgress(totals.protein, proteinGoal, GOAL_KINDS.protein);

  return (
    <>
      <Link to="/nutrition" className={`${tile} ${wide} bg-peach active:opacity-90`}>
        <TileTitle title="Alimentation" link />
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-6xl leading-none numeral">{formatMacro('kcal', totals.kcal)}</span>
          <span className="font-semibold text-ink/75 tabular-nums">
            {kcalGoal === undefined ? 'kcal' : `/ ${formatMacro('kcal', kcalGoal)} kcal`}
          </span>
        </p>
        {kcal && (
          <div className="mt-3.5">
            <ProgressBar ratio={kcal.ratio} tone={kcal.bad ? 'danger-ink' : 'ink'} />
          </div>
        )}
        <p
          className={`mt-2.5 text-sm font-semibold tabular-nums ${kcal?.bad ? 'text-danger-ink' : 'text-ink/75'}`}
        >
          {data.entries.length === 0
            ? 'Rien de noté pour l’instant : ajoute ton premier repas.'
            : kcalCaption(kcal)}
        </p>
      </Link>

      <Link to="/nutrition" className={`${tile} bg-lilac active:opacity-90`}>
        <TileTitle title="Protéines" />
        <p className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl leading-none numeral">{formatMacro('protein', totals.protein)}</span>
          <span className="text-sm font-semibold text-ink/75 tabular-nums">
            {proteinGoal === undefined ? 'g' : `/ ${formatMacro('protein', proteinGoal)} g`}
          </span>
        </p>
        {protein && (
          <div className="mt-3.5">
            <ProgressBar ratio={protein.ratio} tone="ink" />
          </div>
        )}
      </Link>
    </>
  );
}

export function WeightCard({ today }: { today: LocalDate }) {
  const entries = useLiveQuery(listBodyWeights);
  if (!entries) return <TilePlaceholder label="Poids" />;
  const { latest, isToday, daysAgo, change } = todayWeight(entries, today);

  return (
    <Link to="/stats" className={`${tile} bg-mint active:opacity-90`}>
      <TileTitle title="Poids" />
      {latest && daysAgo !== undefined ? (
        <>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl leading-none numeral">{formatWeight(latest.kg)}</span>
            <span className="text-sm font-semibold text-ink/75">kg</span>
          </p>
          {change && (
            <p className="mt-2.5 text-sm font-semibold text-ink/75 tabular-nums">
              {formatSignedBodyWeight(change.kg)} en {change.days} jours
            </p>
          )}
          <p className="mt-1 text-sm font-semibold text-ink/75">
            {isToday ? 'Pesée du jour enregistrée.' : `Dernière pesée ${agoLabel(daysAgo)}.`}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm font-semibold text-ink/75">Aucune pesée pour l’instant.</p>
      )}
    </Link>
  );
}

function WorkoutLine({ workout, now }: { workout: Workout; now?: number }) {
  const sets = useLiveQuery(() => getWorkoutSets(workout.id), [workout.id]);
  if (!sets) return <p className="text-sm font-semibold text-ink/75">…</p>;
  const stats = workoutStats(workout, sets, now);
  const parts = [
    stats.durationMs !== undefined && formatDuration(stats.durationMs),
    plural(stats.completedSets, 'série'),
    stats.volumeKg > 0 && formatVolume(stats.volumeKg),
  ];
  return (
    <p className="text-sm font-semibold text-ink/75 tabular-nums">{parts.filter(Boolean).join(' · ')}</p>
  );
}

function ActiveWorkoutCard({ workout }: { workout: Workout }) {
  const now = useNow(30_000);
  return (
    <Link
      to={`/gym/workout/${workout.id}`}
      className={`${tile} ${wide} flex min-h-24 items-center gap-3 bg-sky active:opacity-90`}
    >
      <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-ink" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-extrabold">{workout.name ?? 'Séance en cours'}</span>
        <WorkoutLine workout={workout} now={now} />
      </span>
      <span className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-on-ink">Reprendre</span>
    </Link>
  );
}

export function GymCard({ today }: { today: LocalDate }) {
  const workouts = useLiveQuery(listAllWorkouts);
  if (!workouts) return <TilePlaceholder label="Salle" className={wide} />;
  const state = todayWorkouts(workouts, today);

  if (state.kind === 'active') return <ActiveWorkoutCard workout={state.workout} />;

  if (state.kind === 'done') {
    return (
      <section aria-labelledby="today-gym" className={`${tile} ${wide} bg-sky`}>
        <h2 id="today-gym" className="text-[15px] font-bold">
          Salle
        </h2>
        <ul className="mt-1 divide-y divide-ink/15">
          {state.workouts.map((w) => (
            <li key={w.id}>
              <Link
                to={`/gym/workout/${w.id}/summary`}
                className="-mx-2 flex min-h-14 items-center gap-2 rounded-2xl px-2 active:bg-ink/10"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{w.name ?? 'Séance du jour'}</span>
                  <WorkoutLine workout={w} />
                </span>
                <ForwardIcon className="size-[18px]" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="today-gym" className={`${tile} ${wide} bg-sky`}>
      <h2 id="today-gym" className="text-[15px] font-bold">
        Salle
      </h2>
      <p className="mt-2 text-xl font-extrabold tracking-tight">Pas de séance aujourd’hui</p>
      <p className="mt-0.5 text-sm font-semibold text-ink/75">
        {state.last
          ? `Dernière séance ${agoLabel(state.last.daysAgo)}.`
          : 'Ta première séance apparaîtra ici.'}
      </p>
      <Link
        to="/gym?start=1"
        className="mt-3.5 flex min-h-12 items-center justify-center rounded-full bg-ink px-5 font-bold text-on-ink active:opacity-80"
      >
        Commencer une séance
      </Link>
    </section>
  );
}

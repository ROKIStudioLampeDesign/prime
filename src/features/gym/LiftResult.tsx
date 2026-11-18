import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { LiftBadge } from '../../components/LiftBadge';
import type { Exercise, Workout, WorkoutSet } from '../../db/db';
import { getRecordsBefore } from '../../db/stats';
import { LIFT_IDS, liftBadgesCrossed, liftRankLabel, TRACKED_LIFTS, type LiftId } from '../../domain/lifts';
import { formatWeight } from '../../lib/format';

interface LiftResultsProps {
  workout: Workout;
  sets: readonly WorkoutSet[];
  exercises: ReadonlyMap<number, Exercise>;
}

/** End-of-session verdicts for the lifts Records follows (bench, squat, deadlift, power clean, snatch). */
export function LiftResults({ workout, sets, exercises }: LiftResultsProps) {
  const trained = new Set(sets.map((s) => s.exerciseId));
  const lifts = LIFT_IDS.flatMap((lift) => {
    const exercise = [...exercises.values()].find((e) => e.seedId === TRACKED_LIFTS[lift].seedId);
    return exercise && trained.has(exercise.id) ? [{ lift, exercise }] : [];
  });
  return (
    <>
      {lifts.map(({ lift, exercise }) => (
        <LiftResult key={lift} lift={lift} exercise={exercise} workout={workout} sets={sets} />
      ))}
    </>
  );
}

interface LiftResultProps {
  lift: LiftId;
  exercise: Exercise;
  workout: Workout;
  sets: readonly WorkoutSet[];
}

/**
 * One lift's verdict: "Record battu" when its heaviest single beats every earlier session, and the
 * milestone badges it unlocked. Without a record or a badge, it only speaks after a PR attempt.
 */
function LiftResult({ lift, exercise, workout, sets }: LiftResultProps) {
  const scale = TRACKED_LIFTS[lift];
  const name = scale.label.toLowerCase();
  const liftSets = sets.filter((s) => s.exerciseId === exercise.id && s.completed && s.reps > 0);
  const bestKg = liftSets.reduce((max, s) => Math.max(max, s.weightKg), 0);
  const before = useLiveQuery(
    async () => (await getRecordsBefore(exercise.id, workout)).weight?.weightKg ?? 0,
    [exercise.id, workout.id, workout.startedAt],
  );
  if (bestKg === 0 || before === undefined) return null;

  const record = bestKg > before;
  const badges = liftBadgesCrossed(scale, before, bestKg);
  // Workouts named "PR bench" come from the former bench PR session.
  const attempted =
    workout.prAttempts?.some((a) => a.exerciseId === exercise.id) === true ||
    (lift === 'bench' && workout.name === 'PR bench');
  if (!record && badges.length === 0 && !attempted) return null;

  return (
    <section
      aria-label={`Résultat au ${name}`}
      className={`mt-3 bleed py-4 ${record ? 'bg-nutrition text-ink' : 'bg-surface'}`}
    >
      <p className="text-[1.625rem] leading-tight headline">
        {record ? 'Record battu' : 'Pas de record cette fois'}
      </p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${record ? 'text-ink/72' : 'text-muted'}`}>
        {record
          ? `${formatWeight(bestKg)} kg au ${name}${before > 0 ? ` · avant : ${formatWeight(before)} kg` : ''}`
          : `Meilleure charge au ${name} : ${formatWeight(bestKg)} kg · record : ${formatWeight(before)} kg`}
      </p>
      {badges.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-extrabold">{badges.length > 1 ? 'Nouveaux rangs' : 'Nouveau rang'}</p>
          <ul className="mt-2 flex flex-wrap gap-3">
            {badges.map((kg, i) => (
              <li key={kg} className="flex flex-col items-center">
                <RankReveal delayMs={i * RANK_STAGGER_MS}>
                  <LiftBadge lift={lift} kg={kg} unlocked size={88} />
                </RankReveal>
                <span
                  className="text-sm font-black motion-safe:animate-rank-label"
                  style={{ animationDelay: `${i * RANK_STAGGER_MS + 600}ms` }}
                >
                  {liftRankLabel(scale, kg)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const RANK_STAGGER_MS = 350;

/**
 * Plays once when a new rank shows up: the badge pops in with a flash while a ring bursts behind
 * it, in the band's text colour. Nothing moves when the system asks for reduced motion.
 */
function RankReveal({ delayMs, children }: { delayMs: number; children: ReactNode }) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full opacity-0 motion-safe:animate-rank-burst"
        style={{ animationDelay: `${delayMs + 250}ms` }}
      >
        <circle cx="50" cy="46" r="30" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
      <div className="relative motion-safe:animate-rank-in" style={{ animationDelay: `${delayMs}ms` }}>
        {children}
      </div>
    </div>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { BenchBadge } from '../../components/BenchBadge';
import type { Exercise, Workout, WorkoutSet } from '../../db/db';
import { BENCH_SEED_ID } from '../../db/exerciseSeed';
import { getRecordsBefore } from '../../db/stats';
import { benchBadgesCrossed, benchRankLabel } from '../../domain/streaks';
import { formatWeight } from '../../lib/format';

interface BenchResultProps {
  workout: Workout;
  sets: readonly WorkoutSet[];
  exercises: ReadonlyMap<number, Exercise>;
}

/**
 * End-of-session bench verdict: "Record battu" when the heaviest bench single beats every earlier
 * session, and the milestone badges it unlocked. Says nothing when the session had no bench set.
 */
export function BenchResult({ workout, sets, exercises }: BenchResultProps) {
  const bench = [...exercises.values()].find((e) => e.seedId === BENCH_SEED_ID);
  const benchSets = sets.filter((s) => s.exerciseId === bench?.id && s.completed && s.reps > 0);
  const bestKg = benchSets.reduce((max, s) => Math.max(max, s.weightKg), 0);
  const before = useLiveQuery(
    async () => (bench ? ((await getRecordsBefore(bench.id, workout)).weight?.weightKg ?? 0) : 0),
    [bench?.id, workout.id, workout.startedAt],
  );
  if (!bench || bestKg === 0 || before === undefined) return null;

  const record = bestKg > before;
  const badges = benchBadgesCrossed(before, bestKg);
  const isPrSession = workout.name === 'PR bench';
  if (!record && badges.length === 0 && !isPrSession) return null;

  return (
    <section
      aria-label="Résultat au bench"
      className={`mt-3 bleed py-4 ${record ? 'bg-nutrition text-ink' : 'bg-surface'}`}
    >
      <p className="text-[1.625rem] leading-tight headline">
        {record ? 'Record battu' : 'Pas de record cette fois'}
      </p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${record ? 'text-ink/72' : 'text-muted'}`}>
        {record
          ? `${formatWeight(bestKg)} kg au bench${before > 0 ? ` · avant : ${formatWeight(before)} kg` : ''}`
          : `Meilleure charge : ${formatWeight(bestKg)} kg · record : ${formatWeight(before)} kg`}
      </p>
      {badges.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-extrabold">{badges.length > 1 ? 'Nouveaux rangs' : 'Nouveau rang'}</p>
          <ul className="mt-2 flex flex-wrap gap-3">
            {badges.map((kg, i) => (
              <li key={kg} className="flex flex-col items-center">
                <RankReveal delayMs={i * RANK_STAGGER_MS}>
                  <BenchBadge kg={kg} unlocked size={88} />
                </RankReveal>
                <span
                  className="text-sm font-black motion-safe:animate-rank-label"
                  style={{ animationDelay: `${i * RANK_STAGGER_MS + 600}ms` }}
                >
                  {benchRankLabel(kg)}
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

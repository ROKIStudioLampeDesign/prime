import { useLiveQuery } from 'dexie-react-hooks';
import { BenchBadge } from '../../components/BenchBadge';
import type { Exercise, Workout, WorkoutSet } from '../../db/db';
import { BENCH_SEED_ID } from '../../db/exerciseSeed';
import { getRecordsBefore } from '../../db/stats';
import { benchBadgesCrossed } from '../../domain/streaks';
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
          <p className="text-sm font-extrabold">{badges.length > 1 ? 'Nouveaux badges' : 'Nouveau badge'}</p>
          <ul className="mt-2 flex flex-wrap gap-3">
            {badges.map((kg) => (
              <li key={kg}>
                <BenchBadge kg={kg} unlocked goal={kg === 120} size={88} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

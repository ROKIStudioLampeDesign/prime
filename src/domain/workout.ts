/** A logged set, as far as the domain is concerned. */
export interface SetData {
  exerciseId: number;
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
}

/** Weight and reps of one set, without bookkeeping. */
export interface SetValues {
  weightKg: number;
  reps: number;
}

export interface PerformedSet extends SetValues {
  setNumber: number;
}

export interface WorkoutHistoryItem {
  workoutId: number;
  /** Epoch ms; used to order workouts. */
  startedAt: number;
  sets: readonly SetData[];
}

/**
 * The completed sets of `exerciseId` in the most recent workout that started before `before`
 * (excluding `excludeWorkoutId`), sorted by set number. Undefined when never performed.
 * Workouts where the exercise has no completed set are skipped.
 */
export function lastPerformance(
  history: readonly WorkoutHistoryItem[],
  exerciseId: number,
  options: { before?: number; excludeWorkoutId?: number } = {},
): PerformedSet[] | undefined {
  const candidates = history
    .filter(
      (w) =>
        w.workoutId !== options.excludeWorkoutId &&
        (options.before === undefined || w.startedAt < options.before),
    )
    .sort((a, b) => b.startedAt - a.startedAt);
  for (const workout of candidates) {
    const sets = workout.sets
      .filter((s) => s.exerciseId === exerciseId && s.completed)
      .map(({ setNumber, weightKg, reps }) => ({ setNumber, weightKg, reps }))
      .sort((a, b) => a.setNumber - b.setNumber);
    if (sets.length > 0) return sets;
  }
  return undefined;
}

/** Previous values for a set number: the same set number, else the last set performed. */
export function previousForSet(
  previous: readonly PerformedSet[] | undefined,
  setNumber: number,
): PerformedSet | undefined {
  if (!previous || previous.length === 0) return undefined;
  return previous.find((s) => s.setNumber === setNumber) ?? previous[previous.length - 1];
}

/**
 * Initial values for `count` sets of an exercise: each set copies the same set number from the
 * previous performance (fallback: its last set). Without history: 0 kg and `fallbackReps` (or 0).
 */
export function prefillSets(
  previous: readonly PerformedSet[] | undefined,
  count: number,
  fallbackReps = 0,
): PerformedSet[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const setNumber = i + 1;
    const p = previousForSet(previous, setNumber);
    return { setNumber, weightKg: p?.weightKg ?? 0, reps: p?.reps ?? fallbackReps };
  });
}

/** Default number of sets when an exercise is added without a template. */
export function defaultSetCount(previous: readonly PerformedSet[] | undefined): number {
  return previous && previous.length > 0 ? previous.length : 3;
}

/**
 * Values for a set appended to an exercise: the previous performance's set with that exact
 * number if there is one, else a copy of the current last set, else the previous fallback.
 */
export function nextSetValues(
  currentSets: readonly SetValues[],
  previous: readonly PerformedSet[] | undefined,
): PerformedSet {
  const setNumber = currentSets.length + 1;
  const exact = previous?.find((s) => s.setNumber === setNumber);
  if (exact) return { setNumber, weightKg: exact.weightKg, reps: exact.reps };
  const last = currentSets[currentSets.length - 1];
  if (last) return { setNumber, weightKg: last.weightKg, reps: last.reps };
  const p = previousForSet(previous, setNumber);
  return { setNumber, weightKg: p?.weightKg ?? 0, reps: p?.reps ?? 0 };
}

/** Volume = Σ weight × reps over completed sets (bodyweight sets at 0 kg add nothing). */
export function workoutVolume(sets: readonly Pick<SetData, 'weightKg' | 'reps' | 'completed'>[]): number {
  return sets.reduce(
    (sum, s) => (s.completed ? sum + Math.max(0, s.weightKg) * Math.max(0, s.reps) : sum),
    0,
  );
}

export interface WorkoutStats {
  volumeKg: number;
  completedSets: number;
  /** Distinct exercises with at least one completed set. */
  exercises: number;
  /** Duration in ms, or undefined while unfinished and no `now` is given. */
  durationMs?: number;
}

export function workoutStats(
  workout: { startedAt: number; endedAt?: number },
  sets: readonly SetData[],
  now?: number,
): WorkoutStats {
  const done = sets.filter((s) => s.completed);
  const end = workout.endedAt ?? now;
  return {
    volumeKg: workoutVolume(done),
    completedSets: done.length,
    exercises: new Set(done.map((s) => s.exerciseId)).size,
    durationMs: end === undefined ? undefined : Math.max(0, end - workout.startedAt),
  };
}

/** Adds `delta` kg, never below 0, rounded to 0.01 kg to avoid float drift (2.5 + 1.25 …). */
export function stepWeight(weightKg: number, delta: number): number {
  const base = Number.isFinite(weightKg) ? weightKg : 0;
  return Math.max(0, Math.round((base + delta) * 100) / 100);
}

/** Whole seconds left on a rest timer ending at `endsAt` (epoch ms); 0 once elapsed. */
export function restRemaining(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export interface TemplateExercise {
  exerciseId: number;
  targetSets: number;
  targetReps?: number;
}

/**
 * Template exercises from a workout's sets, in exercise order: one entry per exercise with its
 * number of sets and the reps of its last set as the target.
 */
export function templateFromSets(
  sets: readonly (Pick<SetData, 'exerciseId' | 'setNumber' | 'reps'> & { order: number })[],
): TemplateExercise[] {
  const byExercise = new Map<number, { order: number; sets: { setNumber: number; reps: number }[] }>();
  for (const s of sets) {
    const entry = byExercise.get(s.exerciseId) ?? { order: s.order, sets: [] };
    entry.order = Math.min(entry.order, s.order);
    entry.sets.push(s);
    byExercise.set(s.exerciseId, entry);
  }
  return [...byExercise.entries()]
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([exerciseId, { sets: exSets }]) => {
      const last = [...exSets].sort((a, b) => a.setNumber - b.setNumber).at(-1);
      return {
        exerciseId,
        targetSets: exSets.length,
        ...(last && last.reps > 0 && { targetReps: last.reps }),
      };
    });
}

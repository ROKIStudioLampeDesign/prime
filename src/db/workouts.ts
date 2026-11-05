import { fromLocalDate, todayLocalDate, type LocalDate } from '../domain/date';
import { moveItem } from '../domain/meal';
import {
  defaultSetCount,
  lastPerformance,
  nextSetValues,
  prefillSets,
  prefillFromPlan,
  templateAfterWorkout,
  templateFromSets,
  type TemplateSet,
  workoutStats,
  type PerformedSet,
  type WorkoutHistoryItem,
  type WorkoutStats,
} from '../domain/workout';
import { db, type PrimeDB, type Workout, type WorkoutSet } from './db';
import { createTemplate } from './templates';

export function getWorkout(id: number, database: PrimeDB = db): Promise<Workout | undefined> {
  return database.workouts.get(id);
}

/** The workout being logged, if any (there is at most one). */
export function getActiveWorkout(database: PrimeDB = db): Promise<Workout | undefined> {
  return database.workouts.where('status').equals('active').first();
}

/** Sets of a workout, ordered by exercise then set number. */
export async function getWorkoutSets(workoutId: number, database: PrimeDB = db): Promise<WorkoutSet[]> {
  const sets = await database.workoutSets.where('workoutId').equals(workoutId).toArray();
  return sets.sort((a, b) => a.order - b.order || a.setNumber - b.setNumber);
}

/** Finished workouts, most recent first. */
export async function listDoneWorkouts(database: PrimeDB = db): Promise<Workout[]> {
  const workouts = await database.workouts.where('status').equals('done').toArray();
  return workouts.sort((a, b) => b.startedAt - a.startedAt);
}

export async function listAllWorkouts(database: PrimeDB = db): Promise<Workout[]> {
  return database.workouts.toArray();
}

async function exerciseHistory(exerciseId: number, database: PrimeDB): Promise<WorkoutHistoryItem[]> {
  const sets = await database.workoutSets.where('exerciseId').equals(exerciseId).toArray();
  const ids = [...new Set(sets.map((s) => s.workoutId))];
  const workouts = await database.workouts.bulkGet(ids);
  return workouts
    .filter((w): w is Workout => w !== undefined && w.status === 'done')
    .map((w) => ({
      workoutId: w.id,
      startedAt: w.startedAt,
      sets: sets.filter((s) => s.workoutId === w.id),
    }));
}

/** Completed sets of the exercise in the last finished workout before `before`. */
export async function getLastPerformance(
  exerciseId: number,
  options: { before?: number; excludeWorkoutId?: number } = {},
  database: PrimeDB = db,
): Promise<PerformedSet[] | undefined> {
  return lastPerformance(await exerciseHistory(exerciseId, database), exerciseId, options);
}

/**
 * The performance new sets copy. None for a finished workout (back-filling a past day): its
 * loads and reps are usually forgotten, so sets start empty instead of guessed.
 */
async function previousForPrefill(
  workout: Workout,
  exerciseId: number,
  database: PrimeDB,
): Promise<PerformedSet[] | undefined> {
  if (workout.status === 'done') return undefined;
  return getLastPerformance(
    exerciseId,
    { before: workout.startedAt, excludeWorkoutId: workout.id },
    database,
  );
}

/**
 * Adds an exercise at the end of a workout, its sets prefilled from the last performance.
 * Returns false if the exercise is already in the workout.
 */
export async function addExerciseToWorkout(
  workoutId: number,
  exerciseId: number,
  options: {
    setCount?: number;
    targetReps?: number;
    plan?: readonly TemplateSet[];
  } = {},
  database: PrimeDB = db,
): Promise<boolean> {
  return database.transaction(
    'rw',
    [database.workouts, database.workoutSets, database.exercises],
    async () => {
      const workout = await database.workouts.get(workoutId);
      if (!workout) throw new Error(`Workout ${workoutId} not found`);
      const sets = await database.workoutSets.where('workoutId').equals(workoutId).toArray();
      if (sets.some((s) => s.exerciseId === exerciseId)) return false;
      const order = sets.reduce((max, s) => Math.max(max, s.order + 1), 0);
      const previous = await previousForPrefill(workout, exerciseId, database);
      // A template's planned sets win; without them, copy the last performance.
      const prefill =
        options.plan && options.plan.length > 0
          ? prefillFromPlan(previous, options.plan, options.targetReps)
          : prefillSets(previous, options.setCount ?? defaultSetCount(previous), options.targetReps);
      await database.workoutSets.bulkAdd(
        prefill.map((p) => ({
          workoutId,
          exerciseId,
          order,
          setNumber: p.setNumber,
          weightKg: p.weightKg,
          reps: p.reps,
          completed: false,
        })),
      );
      return true;
    },
  );
}

/**
 * Starts a workout (from a template, or empty). If one is already active, returns it instead:
 * there is never more than one active workout.
 */
export async function startWorkout(templateId?: number, database: PrimeDB = db): Promise<number> {
  return database.transaction(
    'rw',
    [database.workouts, database.workoutSets, database.templates, database.exercises],
    async () => {
      const active = await getActiveWorkout(database);
      if (active) return active.id;
      const template = templateId !== undefined ? await database.templates.get(templateId) : undefined;
      const now = Date.now();
      const id = await database.workouts.add({
        date: todayLocalDate(new Date(now)),
        status: 'active',
        startedAt: now,
        ...(template && { name: template.name, templateId: template.id }),
      });
      for (const te of template?.exercises ?? []) {
        await addExerciseToWorkout(
          id,
          te.exerciseId,
          { setCount: te.targetSets, targetReps: te.targetReps, plan: te.sets },
          database,
        );
      }
      return id;
    },
  );
}

/**
 * Creates an already-finished workout on a past (or any) day, to back-fill history. From a
 * template it gets the template's exercises and set counts, but every load and rep is left
 * empty: old sessions are usually not remembered. The template itself is never updated.
 */
export async function createPastWorkout(
  date: LocalDate,
  templateId?: number,
  database: PrimeDB = db,
): Promise<number> {
  return database.transaction(
    'rw',
    [database.workouts, database.workoutSets, database.templates, database.exercises],
    async () => {
      const template = templateId !== undefined ? await database.templates.get(templateId) : undefined;
      // Noon avoids landing on another day around DST changes; duration is unknown.
      const startedAt = fromLocalDate(date).getTime() + 12 * 3_600_000;
      const id = await database.workouts.add({
        date,
        status: 'done',
        startedAt,
        ...(template && { name: template.name, templateId: template.id }),
      });
      for (const te of template?.exercises ?? []) {
        // No plan or target reps: only the number of sets is kept.
        await addExerciseToWorkout(
          id,
          te.exerciseId,
          { setCount: te.sets && te.sets.length > 0 ? te.sets.length : te.targetSets },
          database,
        );
      }
      return id;
    },
  );
}

export async function addSet(workoutId: number, exerciseId: number, database: PrimeDB = db): Promise<void> {
  await database.transaction(
    'rw',
    [database.workouts, database.workoutSets, database.exercises],
    async () => {
      const workout = await database.workouts.get(workoutId);
      if (!workout) return;
      const current = (await database.workoutSets.where({ exerciseId, workoutId }).toArray()).sort(
        (a, b) => a.setNumber - b.setNumber,
      );
      const previous = await previousForPrefill(workout, exerciseId, database);
      const next = nextSetValues(current, previous);
      const order =
        current[0]?.order ??
        (await database.workoutSets.where('workoutId').equals(workoutId).toArray()).reduce(
          (max, s) => Math.max(max, s.order + 1),
          0,
        );
      await database.workoutSets.add({
        workoutId,
        exerciseId,
        order,
        setNumber: next.setNumber,
        weightKg: next.weightKg,
        reps: next.reps,
        completed: false,
      });
    },
  );
}

/** Removes a set and renumbers the remaining sets of that exercise. */
export async function removeSet(setId: number, database: PrimeDB = db): Promise<void> {
  await database.transaction('rw', database.workoutSets, async () => {
    const set = await database.workoutSets.get(setId);
    if (!set) return;
    await database.workoutSets.delete(setId);
    const rest = (
      await database.workoutSets.where({ exerciseId: set.exerciseId, workoutId: set.workoutId }).toArray()
    ).sort((a, b) => a.setNumber - b.setNumber);
    await Promise.all(rest.map((s, i) => database.workoutSets.update(s.id, { setNumber: i + 1 })));
  });
}

export async function updateSet(
  setId: number,
  changes: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rpe'>>,
  database: PrimeDB = db,
): Promise<void> {
  await database.workoutSets.update(setId, changes);
}

/**
 * Marks a set done/undone. Completing a set of an active workout starts the rest timer
 * (when `restSeconds` > 0); the end time is stored, so it survives locks and reloads.
 */
export async function setCompleted(
  setId: number,
  completed: boolean,
  restSeconds = 0,
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction('rw', [database.workouts, database.workoutSets], async () => {
    const set = await database.workoutSets.get(setId);
    if (!set) return;
    const now = Date.now();
    await database.workoutSets.update(setId, { completed, completedAt: completed ? now : undefined });
    const workout = await database.workouts.get(set.workoutId);
    if (completed && workout?.status === 'active' && restSeconds > 0) {
      await database.workouts.update(workout.id, { restEndsAt: now + restSeconds * 1000 });
    }
  });
}

export async function setRestEndsAt(workoutId: number, endsAt: number | undefined, database: PrimeDB = db) {
  await database.workouts.update(workoutId, { restEndsAt: endsAt });
}

/** Rewrites `order` so exercises are numbered 0..n-1 following `exerciseIds`. */
async function applyExerciseOrder(workoutId: number, exerciseIds: number[], database: PrimeDB) {
  const sets = await database.workoutSets.where('workoutId').equals(workoutId).toArray();
  await Promise.all(
    sets.map((s) => {
      const order = exerciseIds.indexOf(s.exerciseId);
      return order >= 0 && order !== s.order ? database.workoutSets.update(s.id, { order }) : undefined;
    }),
  );
}

async function exerciseOrder(workoutId: number, database: PrimeDB): Promise<number[]> {
  const sets = await getWorkoutSets(workoutId, database);
  return [...new Set(sets.map((s) => s.exerciseId))];
}

export async function moveExercise(
  workoutId: number,
  exerciseId: number,
  delta: -1 | 1,
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction('rw', database.workoutSets, async () => {
    const ids = await exerciseOrder(workoutId, database);
    const from = ids.indexOf(exerciseId);
    await applyExerciseOrder(workoutId, moveItem(ids, from, from + delta), database);
  });
}

export async function removeExercise(
  workoutId: number,
  exerciseId: number,
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction('rw', database.workoutSets, async () => {
    await database.workoutSets.where({ exerciseId, workoutId }).delete();
    await applyExerciseOrder(workoutId, await exerciseOrder(workoutId, database), database);
  });
}

/**
 * Ends the active workout: unvalidated (placeholder) sets are dropped. A workout started from a
 * template whose exercises were kept updates that template with the sets just done (count, loads,
 * reps), so the next session starts from them.
 */
export async function finishWorkout(workoutId: number, database: PrimeDB = db): Promise<void> {
  await database.transaction(
    'rw',
    [database.workouts, database.workoutSets, database.templates],
    async () => {
      const workout = await database.workouts.get(workoutId);
      const sets = await database.workoutSets.where('workoutId').equals(workoutId).toArray();
      const completed = sets.filter((s) => s.completed);
      await database.workoutSets.bulkDelete(sets.filter((s) => !s.completed).map((s) => s.id));
      await applyExerciseOrder(workoutId, await exerciseOrder(workoutId, database), database);
      const now = Date.now();
      await database.workouts.update(workoutId, { status: 'done', endedAt: now, restEndsAt: undefined });

      const template =
        workout?.templateId === undefined ? undefined : await database.templates.get(workout.templateId);
      if (!template) return;
      const exercises = templateAfterWorkout(
        template.exercises,
        sets.map((s) => s.exerciseId),
        completed,
      );
      if (exercises) await database.templates.update(template.id, { exercises, updatedAt: now });
    },
  );
}

export async function updateWorkoutMeta(
  workoutId: number,
  changes: { name?: string; notes?: string; date?: LocalDate },
  database: PrimeDB = db,
): Promise<void> {
  await database.workouts.update(workoutId, {
    ...('name' in changes && { name: changes.name?.trim() || undefined }),
    ...('notes' in changes && { notes: changes.notes?.trim() || undefined }),
    ...(changes.date && { date: changes.date }),
  });
}

export async function deleteWorkout(workoutId: number, database: PrimeDB = db): Promise<void> {
  await database.transaction('rw', [database.workouts, database.workoutSets], async () => {
    await database.workoutSets.where('workoutId').equals(workoutId).delete();
    await database.workouts.delete(workoutId);
  });
}

/** Saves the workout's exercises (with set counts and last reps) as a new template. */
export async function saveWorkoutAsTemplate(workoutId: number, name: string, database: PrimeDB = db) {
  const sets = await getWorkoutSets(workoutId, database);
  return createTemplate({ name, exercises: templateFromSets(sets) }, database);
}

export interface WorkoutSummary {
  workout: Workout;
  stats: WorkoutStats;
  /** Exercise ids in workout order. */
  exerciseIds: number[];
}

/** Finished workouts with their stats, most recent first (for the history list). */
export async function listWorkoutSummaries(database: PrimeDB = db): Promise<WorkoutSummary[]> {
  const workouts = await listDoneWorkouts(database);
  const sets = await database.workoutSets
    .where('workoutId')
    .anyOf(workouts.map((w) => w.id))
    .toArray();
  const byWorkout = new Map<number, WorkoutSet[]>();
  for (const s of sets) byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s]);
  return workouts.map((workout) => {
    const ws = (byWorkout.get(workout.id) ?? []).sort(
      (a, b) => a.order - b.order || a.setNumber - b.setNumber,
    );
    return {
      workout,
      stats: workoutStats(workout, ws),
      exerciseIds: [...new Set(ws.map((s) => s.exerciseId))],
    };
  });
}

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrimeDB } from './db';
import { createExercise, deleteExercise, exerciseUsage, updateExercise } from './exercises';
import { EXERCISE_SEED } from './exerciseSeed';
import { createTemplate, duplicateTemplate, getTemplate } from './templates';
import {
  addExerciseToWorkout,
  addSet,
  createPastWorkout,
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  getLastPerformance,
  getWorkout,
  getWorkoutSets,
  moveExercise,
  removeExercise,
  removeSet,
  saveWorkoutAsTemplate,
  setCompleted,
  startWorkout,
  updateSet,
} from './workouts';
import type { LocalDate } from '../domain/date';

let n = 0;
let db: PrimeDB;
beforeEach(() => {
  db = new PrimeDB(`prime-gym-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

async function seededId(seedId: string): Promise<number> {
  const ex = await db.exercises.where('seedId').equals(seedId).first();
  if (!ex) throw new Error(seedId);
  return ex.id;
}

/** Logs a finished workout with the given sets for one exercise. */
async function pastWorkout(exerciseId: number, sets: [number, number][], startedAt: number) {
  const id = await db.workouts.add({
    date: '2026-10-01' as LocalDate,
    status: 'done',
    startedAt,
    endedAt: startedAt + 1,
  });
  await db.workoutSets.bulkAdd(
    sets.map(([weightKg, reps], i) => ({
      workoutId: id,
      exerciseId,
      order: 0,
      setNumber: i + 1,
      weightKg,
      reps,
      completed: true,
    })),
  );
  return id;
}

describe('exercise seed in the database', () => {
  it('seeds a fresh database once', async () => {
    expect(await db.exercises.count()).toBe(EXERCISE_SEED.length);
    db.close();
    db = new PrimeDB(db.name);
    expect(await db.exercises.count()).toBe(EXERCISE_SEED.length);
    expect(await db.exercises.where('isCustom').equals(0).count()).toBe(EXERCISE_SEED.length);
  });

  it('seeds on upgrade from v3 and keeps existing data', async () => {
    const name = `prime-gym-v3-${n}`;
    const v3 = new Dexie(name);
    v3.version(3).stores({
      settings: 'key',
      foods: '++id, nameNormalized, barcode, createdAt',
      meals: '++id, nameNormalized, createdAt',
      goals: 'id',
      logEntries: '++id, date, foodId, mealId, createdAt',
    });
    await v3.table('goals').put({ id: 'default', kcal: 2000, updatedAt: 0 });
    v3.close();

    await db.delete();
    db = new PrimeDB(name);
    expect(await db.exercises.count()).toBe(EXERCISE_SEED.length);
    expect((await db.goals.get('default'))?.kcal).toBe(2000);
    expect(db.verno).toBe(7);
  });
});

describe('custom exercises', () => {
  it('creates, edits, and refuses to delete when used or built-in', async () => {
    const id = await createExercise(
      { name: ' Curl araignée ', primaryMuscles: ['biceps'], secondaryMuscles: ['biceps', 'forearms'] },
      db,
    );
    const created = await db.exercises.get(id);
    expect(created).toMatchObject({ name: 'Curl araignée', isCustom: 1, secondaryMuscles: ['forearms'] });

    await updateExercise(id, { name: 'Curl spider', primaryMuscles: ['biceps'], secondaryMuscles: [] }, db);
    expect((await db.exercises.get(id))?.name).toBe('Curl spider');

    await createTemplate({ name: 'Bras', exercises: [{ exerciseId: id, targetSets: 3 }] }, db);
    expect(await exerciseUsage(id, db)).toEqual({ workouts: 0, templates: 1 });
    await expect(deleteExercise(id, db)).rejects.toThrow('in use');

    const bench = await seededId('bench-press');
    await expect(deleteExercise(bench, db)).rejects.toThrow();
    await expect(
      updateExercise(bench, { name: 'x', primaryMuscles: ['chest'], secondaryMuscles: [] }, db),
    ).rejects.toThrow();

    const unused = await createExercise({ name: 'Tmp', primaryMuscles: ['abs'], secondaryMuscles: [] }, db);
    await deleteExercise(unused, db);
    expect(await db.exercises.get(unused)).toBeUndefined();
  });
});

describe('workout logging', () => {
  it('prefills each set from the same set number of the last workout, falling back to the last set', async () => {
    const bench = await seededId('bench-press');
    await pastWorkout(bench, [[50, 10]], 1000);
    await pastWorkout(
      bench,
      [
        [60, 8],
        [62.5, 6],
      ],
      2000,
    );

    const id = await startWorkout(undefined, db);
    await addExerciseToWorkout(id, bench, { setCount: 3 }, db);
    const sets = await getWorkoutSets(id, db);
    expect(sets.map((s) => [s.setNumber, s.weightKg, s.reps, s.completed])).toEqual([
      [1, 60, 8, false],
      [2, 62.5, 6, false],
      [3, 62.5, 6, false],
    ]);
    expect(await addExerciseToWorkout(id, bench, {}, db)).toBe(false); // no duplicates
  });

  it('has a single active workout and a full lifecycle', async () => {
    const bench = await seededId('bench-press');
    const squat = await seededId('back-squat');
    await pastWorkout(squat, [[100, 5]], 1000);

    const id = await startWorkout(undefined, db);
    expect(await startWorkout(undefined, db)).toBe(id);
    expect((await getActiveWorkout(db))?.id).toBe(id);

    await addExerciseToWorkout(id, bench, {}, db); // no history → 3 empty sets
    await addExerciseToWorkout(id, squat, {}, db); // history → 1 set
    let sets = await getWorkoutSets(id, db);
    expect(sets.filter((s) => s.exerciseId === bench)).toHaveLength(3);
    expect(sets.filter((s) => s.exerciseId === squat).map((s) => s.weightKg)).toEqual([100]);

    // Edit, add a set (copies the last current set), reorder, complete with rest timer.
    const firstBench = sets.find((s) => s.exerciseId === bench && s.setNumber === 1);
    if (!firstBench) throw new Error('missing set');
    await updateSet(firstBench.id, { weightKg: 40, reps: 10 }, db);
    await addSet(id, squat, db);
    sets = await getWorkoutSets(id, db);
    expect(sets.filter((s) => s.exerciseId === squat).map((s) => [s.setNumber, s.weightKg])).toEqual([
      [1, 100],
      [2, 100],
    ]);

    await moveExercise(id, squat, -1, db);
    sets = await getWorkoutSets(id, db);
    expect(sets[0]?.exerciseId).toBe(squat);

    const before = Date.now();
    await setCompleted(firstBench.id, true, 90, db);
    const workout = await getWorkout(id, db);
    expect(workout?.restEndsAt).toBeGreaterThanOrEqual(before + 90_000);

    // Remove a set: remaining sets are renumbered.
    const squatSet1 = sets.find((s) => s.exerciseId === squat && s.setNumber === 1);
    if (!squatSet1) throw new Error('missing set');
    await removeSet(squatSet1.id, db);
    sets = await getWorkoutSets(id, db);
    expect(sets.filter((s) => s.exerciseId === squat).map((s) => s.setNumber)).toEqual([1]);

    // Finish: placeholder (uncompleted) sets are dropped; exercises left without sets disappear.
    await finishWorkout(id, db);
    const done = await getWorkout(id, db);
    expect(done).toMatchObject({ status: 'done' });
    expect(done?.endedAt).toBeDefined();
    expect(done).not.toHaveProperty('restEndsAt');
    sets = await getWorkoutSets(id, db);
    expect(sets.map((s) => [s.exerciseId, s.setNumber, s.weightKg, s.order])).toEqual([[bench, 1, 40, 0]]);
    expect(await getActiveWorkout(db)).toBeUndefined();

    // The finished workout now feeds the next prefill.
    expect(await getLastPerformance(bench, {}, db)).toEqual([{ setNumber: 1, weightKg: 40, reps: 10 }]);
  });

  it('starts from a template with targets and last weights', async () => {
    const bench = await seededId('bench-press');
    const row = await seededId('barbell-row');
    await pastWorkout(bench, [[70, 5]], 1000);
    const templateId = await createTemplate(
      {
        name: 'Push',
        exercises: [
          { exerciseId: bench, targetSets: 2, targetReps: 8 },
          { exerciseId: row, targetSets: 2, targetReps: 12 },
        ],
      },
      db,
    );
    const id = await startWorkout(templateId, db);
    expect(await getWorkout(id, db)).toMatchObject({ name: 'Push', templateId });
    const sets = await getWorkoutSets(id, db);
    expect(sets.map((s) => [s.exerciseId, s.order, s.weightKg, s.reps])).toEqual([
      [bench, 0, 70, 5],
      [bench, 0, 70, 5],
      [row, 1, 0, 12],
      [row, 1, 0, 12],
    ]);
  });

  it('updates its template at the end, then starts the next session from those sets', async () => {
    const bench = await seededId('bench-press');
    const row = await seededId('barbell-row');
    const templateId = await createTemplate(
      {
        name: 'Push',
        exercises: [
          { exerciseId: bench, targetSets: 2, targetReps: 8 },
          { exerciseId: row, targetSets: 1 },
        ],
      },
      db,
    );
    const first = await startWorkout(templateId, db);
    const sets = await getWorkoutSets(first, db);
    const [b1, b2, r1] = sets;
    if (!b1 || !b2 || !r1) throw new Error('missing sets');
    await updateSet(b1.id, { weightKg: 60, reps: 10 }, db);
    await updateSet(b2.id, { weightKg: 62.5, reps: 8 }, db);
    await setCompleted(b1.id, true, 0, db);
    await setCompleted(b2.id, true, 0, db);
    await addSet(first, bench, db); // a third set, validated
    const third = (await getWorkoutSets(first, db)).find((s) => s.exerciseId === bench && s.setNumber === 3);
    if (!third) throw new Error('missing third set');
    await updateSet(third.id, { weightKg: 62.5, reps: 6 }, db);
    await setCompleted(third.id, true, 0, db);
    await finishWorkout(first, db); // the row was skipped: its plan stays

    expect((await getTemplate(templateId, db))?.exercises).toEqual([
      {
        exerciseId: bench,
        targetSets: 3,
        targetReps: 6,
        sets: [
          { weightKg: 60, reps: 10 },
          { weightKg: 62.5, reps: 8 },
          { weightKg: 62.5, reps: 6 },
        ],
      },
      { exerciseId: row, targetSets: 1 },
    ]);

    const next = await startWorkout(templateId, db);
    const prefilled = await getWorkoutSets(next, db);
    expect(prefilled.filter((s) => s.exerciseId === bench).map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 10],
      [62.5, 8],
      [62.5, 6],
    ]);
  });

  it('prefills the boxes from a newer session than the template, not from its plan', async () => {
    const bench = await seededId('bench-press');
    const templateId = await createTemplate(
      {
        name: 'Push',
        exercises: [
          {
            exerciseId: bench,
            targetSets: 2,
            sets: [
              { weightKg: 50, reps: 10 },
              { weightKg: 50, reps: 10 },
            ],
          },
        ],
      },
      db,
    );
    await db.templates.update(templateId, { updatedAt: 1000 });
    await pastWorkout(bench, [[60, 8]], 2000); // done outside the template, after its last change
    const id = await startWorkout(templateId, db);
    const sets = await getWorkoutSets(id, db);
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 8],
      [50, 10],
    ]);
  });

  it('leaves its template alone when an exercise was added', async () => {
    const bench = await seededId('bench-press');
    const squat = await seededId('back-squat');
    const plan = [{ exerciseId: bench, targetSets: 1, targetReps: 8 }];
    const templateId = await createTemplate({ name: 'Push', exercises: plan }, db);
    const id = await startWorkout(templateId, db);
    await addExerciseToWorkout(id, squat, {}, db);
    for (const s of await getWorkoutSets(id, db)) await setCompleted(s.id, true, 0, db);
    await finishWorkout(id, db);
    expect((await getTemplate(templateId, db))?.exercises).toEqual(plan);
  });

  it('removes exercises, deletes workouts and back-fills past days', async () => {
    const bench = await seededId('bench-press');
    const squat = await seededId('back-squat');
    const id = await startWorkout(undefined, db);
    await addExerciseToWorkout(id, bench, {}, db);
    await addExerciseToWorkout(id, squat, {}, db);
    await removeExercise(id, bench, db);
    const sets = await getWorkoutSets(id, db);
    expect(new Set(sets.map((s) => s.exerciseId))).toEqual(new Set([squat]));
    expect(sets.every((s) => s.order === 0)).toBe(true);

    await deleteWorkout(id, db);
    expect(await db.workoutSets.where('workoutId').equals(id).count()).toBe(0);
    expect(await getWorkout(id, db)).toBeUndefined();

    const past = await createPastWorkout('2026-10-15' as LocalDate, undefined, db);
    expect(await getWorkout(past, db)).toMatchObject({ date: '2026-10-15', status: 'done' });
  });
});

describe('bodyweight sets (0 kg)', () => {
  it('a 0 kg set carries over as bodyweight, and a template plans it with reps only', async () => {
    const crunch = await seededId('crunch');
    const first = await startWorkout(undefined, db);
    await addExerciseToWorkout(first, crunch, {}, db);
    for (const s of await getWorkoutSets(first, db)) {
      await updateSet(s.id, { reps: 20 }, db);
      await setCompleted(s.id, true, 0, db);
    }
    await finishWorkout(first, db);
    const next = await startWorkout(undefined, db);
    await addExerciseToWorkout(next, crunch, {}, db);
    expect((await getWorkoutSets(next, db))[0]).toMatchObject({ weightKg: 0, reps: 20 });
    await deleteWorkout(next, db);

    // Planned "— kg × 15" stays at bodyweight instead of copying a previous load.
    const templateId = await createTemplate(
      {
        name: 'Abdos',
        exercises: [{ exerciseId: crunch, targetSets: 1, sets: [{ weightKg: 0, reps: 15 }] }],
      },
      db,
    );
    const fromTemplate = await startWorkout(templateId, db);
    expect((await getWorkoutSets(fromTemplate, db))[0]).toMatchObject({ weightKg: 0, reps: 15 });
  });
});

describe('back-filled workouts', () => {
  it('start with empty sets instead of copying the last performance', async () => {
    const bench = await seededId('bench-press');
    const live = await startWorkout(undefined, db);
    await addExerciseToWorkout(live, bench, {}, db);
    for (const s of await getWorkoutSets(live, db)) {
      await updateSet(s.id, { weightKg: 80, reps: 5 }, db);
      await setCompleted(s.id, true, 0, db);
    }
    await finishWorkout(live, db);

    const past = await createPastWorkout('2026-10-01' as LocalDate, undefined, db);
    await addExerciseToWorkout(past, bench, {}, db);
    await addSet(past, bench, db);
    const sets = await getWorkoutSets(past, db);
    expect(sets).toHaveLength(4); // default 3 sets + 1 added
    expect(sets.every((s) => s.weightKg === 0 && s.reps === 0 && !s.completed)).toBe(true);

    // From a template: its exercises and set counts, every load and rep empty.
    const templateId = await createTemplate(
      {
        name: 'Push',
        exercises: [
          {
            exerciseId: bench,
            targetSets: 2,
            targetReps: 8,
            sets: [
              { weightKg: 60, reps: 8 },
              { weightKg: 60, reps: 8 },
            ],
          },
        ],
      },
      db,
    );
    const fromTemplate = await createPastWorkout('2026-10-02' as LocalDate, templateId, db);
    expect(await getWorkout(fromTemplate, db)).toMatchObject({ name: 'Push', templateId, status: 'done' });
    const planned = await getWorkoutSets(fromTemplate, db);
    expect(planned).toHaveLength(2);
    expect(planned.every((s) => s.exerciseId === bench && s.weightKg === 0 && s.reps === 0)).toBe(true);
    expect((await getTemplate(templateId, db))?.exercises[0]?.sets?.[0]).toEqual({ weightKg: 60, reps: 8 });

    // A live workout still copies it.
    const next = await startWorkout(undefined, db);
    await addExerciseToWorkout(next, bench, {}, db);
    expect((await getWorkoutSets(next, db))[0]).toMatchObject({ weightKg: 80, reps: 5 });
  });
});

describe('templates', () => {
  it('saves a workout as a template and duplicates templates', async () => {
    const bench = await seededId('bench-press');
    const id = await startWorkout(undefined, db);
    await addExerciseToWorkout(id, bench, { setCount: 2, targetReps: 8 }, db);
    const templateId = await saveWorkoutAsTemplate(id, 'Ma séance', db);
    expect(await getTemplate(templateId, db)).toMatchObject({
      name: 'Ma séance',
      exercises: [{ exerciseId: bench, targetSets: 2, targetReps: 8 }],
    });
    const copy = await duplicateTemplate(templateId, db);
    expect((await getTemplate(copy, db))?.name).toBe('Ma séance (copie)');
  });
});

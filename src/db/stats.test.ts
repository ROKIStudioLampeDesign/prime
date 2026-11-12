import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LocalDate } from '../domain/date';
import { ZERO_MACROS } from '../domain/nutrition';
import {
  deleteBodyWeight,
  getTargetWeight,
  listBodyWeights,
  setTargetWeight,
  upsertBodyWeight,
} from './bodyWeights';
import { EXERCISE_SEED } from './exerciseSeed';
import { PrimeDB } from './db';
import {
  getRecordsBefore,
  listEntriesBetween,
  listExerciseHistory,
  listWorkoutVolumesBetween,
} from './stats';

const d = (s: string) => s as LocalDate;
let n = 0;
let db: PrimeDB;
beforeEach(() => {
  db = new PrimeDB(`prime-stats-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

describe('schema v5', () => {
  it('migrates v4 → v5 keeping data and adding body weights', async () => {
    const name = `prime-stats-v4-${n}`;
    const v4 = new Dexie(name);
    v4.version(4).stores({
      settings: 'key',
      foods: '++id, nameNormalized, barcode, createdAt',
      meals: '++id, nameNormalized, createdAt',
      goals: 'id',
      logEntries: '++id, date, foodId, mealId, createdAt',
      exercises: '++id, &seedId, nameNormalized, isCustom',
      workouts: '++id, date, status, startedAt, templateId',
      workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
      gymDays: 'date',
      templates: '++id, name',
    });
    await v4.table('workouts').add({ date: '2026-11-01', status: 'done', startedAt: 1 });
    v4.close();

    await db.delete();
    db = new PrimeDB(name);
    expect(db.verno).toBe(10); // opened at the latest version, through v5
    expect(await db.workouts.count()).toBe(1);
    expect(await db.bodyWeights.count()).toBe(0);
    // v5 adds no exercise; the later v9 upgrade runs the seed, which fills the empty library.
    expect(await db.exercises.count()).toBe(EXERCISE_SEED.length);
  });
});

describe('body weights', () => {
  it('upserts one entry per day with 0.1 kg precision', async () => {
    await upsertBodyWeight(d('2026-11-02'), 80.04, db);
    await upsertBodyWeight(d('2026-11-01'), 80.5, db);
    await upsertBodyWeight(d('2026-11-02'), 79.86, db);
    expect((await listBodyWeights(db)).map((w) => [w.date, w.kg])).toEqual([
      ['2026-11-01', 80.5],
      ['2026-11-02', 79.9],
    ]);
    await expect(upsertBodyWeight(d('2026-11-03'), 5, db)).rejects.toThrow();
    const [first] = await listBodyWeights(db);
    if (first) await deleteBodyWeight(first.id, db);
    expect(await listBodyWeights(db)).toHaveLength(1);
  });

  it('stores and clears the target weight', async () => {
    expect(await getTargetWeight(db)).toBeUndefined();
    await setTargetWeight(75.04, db);
    expect(await getTargetWeight(db)).toBe(75);
    await setTargetWeight(undefined, db);
    expect(await getTargetWeight(db)).toBeUndefined();
  });
});

describe('training history', () => {
  async function workout(
    date: string,
    startedAt: number,
    status: 'done' | 'active',
    sets: [number, number, boolean][],
  ) {
    const id = await db.workouts.add({ date: d(date), status, startedAt });
    await db.workoutSets.bulkAdd(
      sets.map(([weightKg, reps, completed], i) => ({
        workoutId: id,
        exerciseId: 1,
        order: 0,
        setNumber: i + 1,
        weightKg,
        reps,
        completed,
      })),
    );
    return id;
  }

  it('groups completed sets of finished workouts by exercise', async () => {
    await workout('2026-11-01', 1000, 'done', [
      [60, 8, true],
      [100, 1, false],
    ]);
    await workout('2026-11-03', 3000, 'active', [[70, 5, true]]);
    const history = await listExerciseHistory(db);
    expect(history.get(1)?.map((s) => s.weightKg)).toEqual([60]);
  });

  it('computes records from before a workout only', async () => {
    await workout('2026-11-01', 1000, 'done', [[60, 8, true]]);
    await workout('2026-11-05', 5000, 'done', [[80, 3, true]]); // later: ignored for an earlier workout
    const current = await workout('2026-11-03', 3000, 'active', [[70, 5, true]]);
    const records = await getRecordsBefore(1, { id: current, startedAt: 3000 }, db);
    expect(records.weight?.value).toBe(60);
    expect(await getRecordsBefore(1, { id: 999, startedAt: 500 }, db)).toEqual({});
  });

  it('lists entries and workout volumes in a date range', async () => {
    await workout('2026-11-02', 1000, 'done', [
      [50, 10, true],
      [50, 10, false],
    ]);
    await workout('2026-11-10', 2000, 'done', [[50, 10, true]]);
    expect(await listWorkoutVolumesBetween(d('2026-11-02'), d('2026-11-08'), db)).toEqual([
      { date: '2026-11-02', volumeKg: 500 },
    ]);
    const base = {
      kind: 'food' as const,
      slot: 'lunch' as const,
      foodId: 1,
      grams: 100,
      name: 'x',
      per100g: ZERO_MACROS,
      macros: ZERO_MACROS,
      createdAt: 0,
      updatedAt: 0,
    };
    await db.logEntries.bulkAdd([
      { ...base, date: d('2026-11-01') },
      { ...base, date: d('2026-11-02') },
      { ...base, date: d('2026-11-08') },
      { ...base, date: d('2026-11-09') },
    ]);
    expect((await listEntriesBetween(d('2026-11-02'), d('2026-11-08'), db)).map((e) => e.date)).toEqual([
      '2026-11-02',
      '2026-11-08',
    ]);
  });
});

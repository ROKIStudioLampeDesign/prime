import { describe, expect, it } from 'vitest';
import { validateBackupRows } from './backupRows';

const per100g = { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 };
const macros = { kcal: 186, protein: 6.75, carbs: 29.35, sugars: 0, fat: 3.5, fiber: 0 };
const photo = { __blob: { type: 'image/jpeg', base64: '/9j/AA==' } };

/** One valid row per table, shaped like a real export. */
const valid = {
  settings: [{ key: 'bodyMap', value: { greenDays: 2 }, updatedAt: 1 }],
  foods: [
    {
      id: 1,
      name: 'Avoine',
      nameNormalized: 'avoine',
      per100g,
      favorite: 0,
      createdAt: 1,
      updatedAt: 1,
      photo,
    },
  ],
  meals: [
    {
      id: 1,
      name: 'Porridge',
      nameNormalized: 'porridge',
      ingredients: [{ foodId: 1, grams: 60 }],
      portions: 2,
      favorite: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  goals: [{ id: 'default', kcal: 2300, protein: 160, updatedAt: 1 }],
  logEntries: [
    {
      id: 1,
      kind: 'food',
      date: '2026-11-02',
      slot: 'breakfast',
      foodId: 1,
      grams: 50,
      name: 'Avoine',
      per100g,
      macros,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 2,
      kind: 'meal',
      date: '2026-11-02',
      slot: 'dinner',
      mealId: 1,
      grams: 250,
      portionGrams: 250,
      portions: 1,
      name: 'Porridge',
      per100g: macros,
      macros,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  exercises: [
    {
      id: 1,
      name: 'Développé couché (barre)',
      nameNormalized: 'developpe couche (barre)',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps'],
      equipment: 'barbell',
      isCustom: 0,
      seedId: 'bench-press',
    },
  ],
  workouts: [{ id: 1, date: '2026-11-02', status: 'done', startedAt: 1, endedAt: 2, name: 'Push' }],
  workoutSets: [
    { id: 1, workoutId: 1, exerciseId: 1, order: 0, setNumber: 1, weightKg: 60, reps: 8, completed: true },
  ],
  gymDays: [
    { date: '2026-11-01', attended: true },
    { date: '2026-11-02', attended: false, rest: true },
  ],
  templates: [
    {
      id: 1,
      name: 'Push',
      exercises: [{ exerciseId: 1, targetSets: 3, targetReps: 8 }],
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  bodyWeights: [{ id: 1, date: '2026-11-02', kg: 80.4, createdAt: 1, updatedAt: 1 }],
};

/** A copy of `valid` where one row of one table is replaced. */
function withRow(table: keyof typeof valid, row: unknown, index = 0) {
  const rows = [...valid[table]] as unknown[];
  rows[index] = row;
  return { ...valid, [table]: rows };
}

describe('validateBackupRows', () => {
  it('accepts rows shaped like a real export', () => {
    expect(validateBackupRows(valid)).toEqual({ ok: true });
  });

  it('accepts empty tables and ignores tables this version does not know', () => {
    expect(validateBackupRows({ foods: [], futureTable: [{ anything: true }] })).toEqual({ ok: true });
  });

  it('rejects a food whose values are not numbers, with the table and row', () => {
    const bad = withRow('foods', { ...valid.foods[0], per100g: { ...per100g, kcal: 'beaucoup' } });
    expect(validateBackupRows(bad)).toEqual({ ok: false, table: 'foods', index: 0 });
  });

  it('rejects missing or mistyped keys', () => {
    expect(
      validateBackupRows(withRow('workoutSets', { ...valid.workoutSets[0], workoutId: undefined })),
    ).toEqual({
      ok: false,
      table: 'workoutSets',
      index: 0,
    });
    expect(validateBackupRows(withRow('settings', { value: 1 }))).toMatchObject({
      ok: false,
      table: 'settings',
    });
    expect(validateBackupRows(withRow('foods', { ...valid.foods[0], id: '1' }))).toMatchObject({ ok: false });
  });

  it('rejects invalid dates, enums and muscle ids', () => {
    expect(
      validateBackupRows(withRow('bodyWeights', { ...valid.bodyWeights[0], date: '2026-02-30' })),
    ).toMatchObject({
      ok: false,
      table: 'bodyWeights',
    });
    expect(
      validateBackupRows(withRow('logEntries', { ...valid.logEntries[0], slot: 'brunch' })),
    ).toMatchObject({
      ok: false,
      table: 'logEntries',
    });
    expect(validateBackupRows(withRow('workouts', { ...valid.workouts[0], status: 'paused' }))).toMatchObject(
      {
        ok: false,
      },
    );
    expect(
      validateBackupRows(withRow('exercises', { ...valid.exercises[0], primaryMuscles: ['pecs'] })),
    ).toMatchObject({ ok: false, table: 'exercises' });
  });

  it('checks each log entry against its own kind', () => {
    const mealWithoutPortionGrams = { ...valid.logEntries[1], portionGrams: undefined };
    expect(validateBackupRows(withRow('logEntries', mealWithoutPortionGrams, 1))).toEqual({
      ok: false,
      table: 'logEntries',
      index: 1,
    });
    expect(
      validateBackupRows(withRow('logEntries', { ...valid.logEntries[0], kind: 'snack' })),
    ).toMatchObject({
      ok: false,
    });
  });

  it('only accepts photos in the encoded blob format', () => {
    expect(
      validateBackupRows(withRow('foods', { ...valid.foods[0], photo: 'data:image/png' })),
    ).toMatchObject({
      ok: false,
      table: 'foods',
    });
    expect(
      validateBackupRows(
        withRow('foods', { ...valid.foods[0], photo: { __blob: { type: 'text/html', base64: 'x' } } }),
      ),
    ).toMatchObject({ ok: false });
  });

  it('rejects non-finite and negative quantities', () => {
    expect(validateBackupRows(withRow('workoutSets', { ...valid.workoutSets[0], reps: -1 }))).toMatchObject({
      ok: false,
    });
    expect(
      validateBackupRows(withRow('meals', { ...valid.meals[0], ingredients: [{ foodId: 1, grams: NaN }] })),
    ).toMatchObject({
      ok: false,
    });
  });

  it('rejects timestamps outside the range of a Date', () => {
    expect(validateBackupRows(withRow('workouts', { ...valid.workouts[0], startedAt: 1e300 }))).toMatchObject(
      {
        ok: false,
        table: 'workouts',
      },
    );
    expect(validateBackupRows(withRow('foods', { ...valid.foods[0], updatedAt: -9e15 }))).toMatchObject({
      ok: false,
      table: 'foods',
    });
    expect(validateBackupRows(withRow('workouts', { ...valid.workouts[0], startedAt: 8.64e15 }))).toEqual({
      ok: true,
    });
  });
});

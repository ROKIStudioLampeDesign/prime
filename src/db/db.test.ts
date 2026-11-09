import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LocalDate } from '../domain/date';
import { PrimeDB } from './db';
import { createFood, deleteFood, getFood, updateFood } from './foods';
import { getGoals, saveGoals } from './goals';
import {
  addEntry,
  addMealEntry,
  deleteEntry,
  listEntriesForDate,
  listRecentItems,
  updateEntry,
} from './logEntries';
import { createMeal, deleteMeal, duplicateMeal, getMeal, summarizeWithFoods, updateMeal } from './meals';
import { summarizeMeal } from '../domain/meal';

const DAY = '2026-11-02' as LocalDate;
const oats = { kcal: 372, protein: 13.5, carbs: 58.7, sugars: 1.2, fat: 7, fiber: 10 };

let name = 0;
let db: PrimeDB;
beforeEach(() => {
  db = new PrimeDB(`prime-test-${++name}`);
});
afterEach(async () => {
  await db.delete();
});

describe('schema', () => {
  it('opens at the latest version', async () => {
    await db.open();
    expect(db.verno).toBe(9);
  });

  it('migrates v7 → v8: a jour rouge becomes a day not counted, over the goal', async () => {
    const dbName = `prime-migration-v7-${name}`;
    const v7 = new Dexie(dbName);
    v7.version(7).stores({
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
      bodyWeights: '++id, &date',
    });
    await v7.table('gymDays').bulkPut([
      { date: '2026-11-07', attended: false, red: true },
      { date: '2026-11-06', attended: false, rest: true },
    ]);
    v7.close();

    const migrated = new PrimeDB(dbName);
    try {
      expect(await migrated.nutritionDays.toArray()).toEqual([
        { date: '2026-11-07', status: 'over', updatedAt: expect.any(Number) as number },
      ]);
      expect(await migrated.gymDays.toArray()).toEqual([
        { date: '2026-11-06', attended: false, rest: true },
        { date: '2026-11-07', attended: false },
      ]);
    } finally {
      await migrated.delete();
    }
  });

  it('migrates v6 → v7: built-in muscles follow the seed, custom exercises are kept', async () => {
    const dbName = `prime-migration-v6-${name}`;
    const v6 = new Dexie(dbName);
    v6.version(6).stores({
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
      bodyWeights: '++id, &date',
    });
    await v6.table('exercises').bulkAdd([
      {
        id: 5,
        seedId: 'deadlift',
        name: 'Soulevé de terre',
        nameNormalized: 'souleve de terre',
        isCustom: 0,
        primaryMuscles: ['hamstrings', 'glutes', 'lower_back'],
        secondaryMuscles: ['quads', 'traps', 'upper_back', 'forearms'],
      },
      {
        id: 6,
        seedId: 'crunch',
        name: 'Crunch',
        nameNormalized: 'crunch',
        isCustom: 0,
        primaryMuscles: ['abs'],
        secondaryMuscles: [],
      },
      {
        id: 12,
        name: 'Crunch',
        nameNormalized: 'crunch',
        isCustom: 1,
        primaryMuscles: ['abs'],
        secondaryMuscles: [],
      },
    ]);
    v6.close();

    db = new PrimeDB(dbName);
    expect((await db.exercises.get(5))?.secondaryMuscles).toEqual([
      'quads',
      'traps',
      'upper_back',
      'lats',
      'forearms',
    ]);
    expect((await db.exercises.get(6))?.secondaryMuscles).toEqual(['obliques']);
    expect((await db.exercises.get(12))?.secondaryMuscles).toEqual([]);
  });

  it('migrates v5 → v6: built-in names follow the seed, ids and custom exercises are kept', async () => {
    const dbName = `prime-migration-v5-${name}`;
    const v5 = new Dexie(dbName);
    v5.version(5).stores({
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
      bodyWeights: '++id, &date',
    });
    const muscles = { primaryMuscles: ['chest'], secondaryMuscles: [] };
    await v5.table('exercises').bulkAdd([
      {
        id: 3,
        seedId: 'bench-press',
        name: 'Développé couché (barre)',
        nameNormalized: 'developpe couche (barre)',
        isCustom: 0,
        ...muscles,
      },
      {
        id: 4,
        seedId: 'db-bench-press',
        name: 'Développé couché (haltères)',
        nameNormalized: 'developpe couche (halteres)',
        isCustom: 0,
        ...muscles,
      },
      {
        id: 9,
        name: 'Développé couché (barre)',
        nameNormalized: 'developpe couche (barre)',
        isCustom: 1,
        ...muscles,
      },
    ]);
    v5.close();

    db = new PrimeDB(dbName);
    expect(await db.exercises.get(3)).toMatchObject({
      name: 'Bench',
      nameNormalized: 'bench',
      seedId: 'bench-press',
    });
    expect((await db.exercises.get(4))?.name).toBe('Développé couché (haltères)');
    // A custom exercise is the user's: never renamed, even with the old built-in name.
    expect((await db.exercises.get(9))?.name).toBe('Développé couché (barre)');
  });

  it('migrates v1 → latest keeping settings', async () => {
    const dbName = `prime-migration-${name}`;
    const v1 = new Dexie(dbName);
    v1.version(1).stores({ settings: 'key' });
    await v1.table('settings').put({ key: 'storagePersisted', value: true, updatedAt: 0 });
    v1.close();

    db = new PrimeDB(dbName);
    expect((await db.settings.get('storagePersisted'))?.value).toBe(true);
    expect(await db.foods.count()).toBe(0);
  });

  it('migrates v2 → v3: food entries get kind and generic name/brand', async () => {
    const dbName = `prime-migration-v2-${name}`;
    const v2 = new Dexie(dbName);
    v2.version(2).stores({
      settings: 'key',
      foods: '++id, nameNormalized, barcode, createdAt',
      goals: 'id',
      logEntries: '++id, date, foodId, createdAt',
    });
    const legacy = {
      date: DAY,
      slot: 'lunch',
      foodId: 7,
      grams: 50,
      per100g: oats,
      createdAt: 1,
      updatedAt: 1,
    };
    await v2.table('logEntries').bulkAdd([
      { ...legacy, foodName: 'Avoine', foodBrand: 'Quaker', macros: {} },
      { ...legacy, foodName: 'Banane', macros: {} },
    ]);
    v2.close();

    db = new PrimeDB(dbName);
    const entries = await db.logEntries.toArray();
    expect(entries[0]).toMatchObject({ kind: 'food', name: 'Avoine', brand: 'Quaker', foodId: 7, grams: 50 });
    expect(entries[0]).not.toHaveProperty('foodName');
    expect(entries[0]).not.toHaveProperty('foodBrand');
    expect(entries[1]).toMatchObject({ kind: 'food', name: 'Banane' });
    expect(entries[1]).not.toHaveProperty('brand');
    expect(await db.meals.count()).toBe(0);
  });
});

describe('foods', () => {
  it('normalizes the searchable name and trims fields', async () => {
    const id = await createFood({ name: ' Crème fraîche ', brand: ' Président ', per100g: oats }, db);
    const food = await getFood(id, db);
    expect(food).toMatchObject({ name: 'Crème fraîche', brand: 'Président', favorite: 0 });
    expect(food?.nameNormalized).toBe('creme fraiche president');
  });

  it('clears optional fields removed on update', async () => {
    const photo = new Blob(['x'], { type: 'image/jpeg' });
    const id = await createFood({ name: 'Avoine', brand: 'Quaker', photo, per100g: oats }, db);
    await updateFood(id, { name: 'Avoine', per100g: oats }, db);
    const food = await getFood(id, db);
    expect(food).not.toHaveProperty('brand');
    expect(food).not.toHaveProperty('photo');
  });
});

describe('log entries', () => {
  it('snapshots the food so later edits and deletion never rewrite history', async () => {
    const foodId = await createFood({ name: 'Avoine', per100g: oats }, db);
    const food = await getFood(foodId, db);
    if (!food) throw new Error('food not created');
    const entryId = await addEntry({ date: DAY, slot: 'breakfast', food, grams: 50 }, db);

    await updateFood(foodId, { name: 'Avoine bio', per100g: { ...oats, kcal: 999 } }, db);
    let [entry] = await listEntriesForDate(DAY, db);
    expect(entry).toMatchObject({ id: entryId, kind: 'food', name: 'Avoine', grams: 50 });
    expect(entry?.macros.kcal).toBe(186);

    await deleteFood(foodId, db);
    await updateEntry(entryId, { grams: 100, slot: 'snack' }, db);
    [entry] = await listEntriesForDate(DAY, db);
    expect(entry).toMatchObject({ grams: 100, slot: 'snack', kind: 'food', name: 'Avoine' });
    expect(entry?.macros.kcal).toBe(372); // recomputed from the snapshot, not the edited food

    await deleteEntry(entryId, db);
    expect(await listEntriesForDate(DAY, db)).toEqual([]);
  });

  it('lists distinct recent foods with their last quantity', async () => {
    const a = { id: 1, name: 'A', per100g: oats };
    const b = { id: 2, name: 'B', per100g: oats };
    await addEntry({ date: DAY, slot: 'lunch', food: a, grams: 10 }, db);
    await addEntry({ date: DAY, slot: 'lunch', food: b, grams: 20 }, db);
    await new Promise((r) => setTimeout(r, 2)); // distinct createdAt
    await addEntry({ date: DAY, slot: 'dinner', food: a, grams: 30 }, db);

    expect(await listRecentItems(10, db)).toEqual([
      { kind: 'food', id: 1, lastGrams: 30 },
      { kind: 'food', id: 2, lastGrams: 20 },
    ]);
    expect(await listRecentItems(1, db)).toHaveLength(1);
  });
});

describe('meals', () => {
  async function setup() {
    const rice = await createFood({ name: 'Riz', per100g: { kcal: 350, protein: 7, carbs: 78, fat: 1 } }, db);
    const oil = await createFood(
      { name: 'Huile', per100g: { kcal: 900, protein: 0, carbs: 0, fat: 100 } },
      db,
    );
    const mealId = await createMeal(
      {
        name: ' Riz sauté ',
        ingredients: [
          { foodId: rice, grams: 200 },
          { foodId: oil, grams: 10 },
        ],
        cookedWeight: 500,
        portions: 2,
      },
      db,
    );
    return { rice, oil, mealId };
  }

  async function summaryOf(mealId: number) {
    const meal = await getMeal(mealId, db);
    if (!meal) throw new Error('meal not found');
    const foods = new Map((await db.foods.toArray()).map((f) => [f.id, f]));
    return { meal, summary: summarizeWithFoods(meal, foods) };
  }

  it('stores ingredients in order and derives macros from current products', async () => {
    const { mealId, oil } = await setup();
    const { meal, summary } = await summaryOf(mealId);
    expect(meal).toMatchObject({ name: 'Riz sauté', nameNormalized: 'riz saute', portions: 2, favorite: 0 });
    expect(meal).not.toHaveProperty('macros');
    expect(summary.total.kcal).toBe(790);
    expect(summary.portionGrams).toBe(250);

    await deleteFood(oil, db);
    const after = await summaryOf(mealId);
    expect(after.summary.missingCount).toBe(1);
    expect(after.summary.total.kcal).toBe(700);
  });

  it('clears optional fields removed on update', async () => {
    const { mealId, rice } = await setup();
    await updateMeal(mealId, { name: 'Riz', ingredients: [{ foodId: rice, grams: 100 }] }, db);
    const meal = await getMeal(mealId, db);
    expect(meal).not.toHaveProperty('portions');
    expect(meal).not.toHaveProperty('cookedWeight');
    expect(meal?.ingredients).toEqual([{ foodId: rice, grams: 100 }]);
  });

  it('duplicates with a fresh name and independent ingredients', async () => {
    const { mealId } = await setup();
    const copyId = await duplicateMeal(mealId, db);
    const copy2Id = await duplicateMeal(mealId, db);
    const copy = await getMeal(copyId, db);
    expect(copy).toMatchObject({ name: 'Riz sauté (copie)', portions: 2, cookedWeight: 500 });
    expect((await getMeal(copy2Id, db))?.name).toBe('Riz sauté (copie 2)');
    await updateMeal(copyId, { name: 'Autre', ingredients: [] }, db);
    expect((await getMeal(mealId, db))?.ingredients).toHaveLength(2);
  });

  it('logs by portions or grams and keeps the snapshot after the meal changes', async () => {
    const { mealId, rice } = await setup();
    const { meal, summary } = await summaryOf(mealId);
    const byPortions = await addMealEntry(
      { date: DAY, slot: 'dinner', meal, summary, serving: { portions: 1.5 } },
      db,
    );
    const byGrams = await addMealEntry(
      { date: DAY, slot: 'dinner', meal, summary, serving: { grams: 100 } },
      db,
    );

    let entries = await listEntriesForDate(DAY, db);
    expect(entries[0]).toMatchObject({
      kind: 'meal',
      mealId,
      name: 'Riz sauté',
      portions: 1.5,
      grams: 375,
      portionGrams: 250,
    });
    expect(entries[0]?.macros.kcal).toBeCloseTo(592.5); // 1.5 × 790 / 2
    expect(entries[1]).not.toHaveProperty('portions');
    expect(entries[1]?.macros.kcal).toBeCloseTo(158); // 100 g of a 500 g, 790 kcal dish

    // Changing or deleting the meal and its products doesn't rewrite the entries.
    await updateMeal(mealId, { name: 'Nouveau', ingredients: [{ foodId: rice, grams: 1000 }] }, db);
    await deleteMeal(mealId, db);
    await deleteFood(rice, db);

    // Editing recomputes from the snapshot: portions → grams, grams → clears portions.
    await updateEntry(byPortions, { portions: 2 }, db);
    await updateEntry(byGrams, { grams: 250 }, db);
    entries = await listEntriesForDate(DAY, db);
    expect(entries[0]).toMatchObject({ name: 'Riz sauté', portions: 2, grams: 500 });
    expect(entries[0]?.macros.kcal).toBeCloseTo(790);
    expect(entries[1]?.macros.kcal).toBeCloseTo(395);

    await updateEntry(byPortions, { grams: 100 }, db);
    expect(await db.logEntries.get(byPortions)).not.toHaveProperty('portions');
  });

  it('refuses to log a meal that weighs nothing', async () => {
    const summary = summarizeMeal({ ingredients: [] });
    await expect(
      addMealEntry(
        { date: DAY, slot: 'lunch', meal: { id: 1, name: 'Vide' }, summary, serving: { portions: 1 } },
        db,
      ),
    ).rejects.toThrow();
  });

  it('lists recent foods and meals together', async () => {
    const { mealId, rice } = await setup();
    const { meal, summary } = await summaryOf(mealId);
    await addEntry(
      { date: DAY, slot: 'lunch', food: { id: rice, name: 'Riz', per100g: summary.total }, grams: 80 },
      db,
    );
    await new Promise((r) => setTimeout(r, 2));
    await addMealEntry({ date: DAY, slot: 'dinner', meal, summary, serving: { portions: 0.5 } }, db);
    expect(await listRecentItems(10, db)).toEqual([
      { kind: 'meal', id: mealId, lastGrams: 125, lastPortions: 0.5 },
      { kind: 'food', id: rice, lastGrams: 80 },
    ]);
  });
});

describe('goals', () => {
  it('returns {} before any save and replaces all goals on save', async () => {
    expect(await getGoals(db)).toEqual({});
    await saveGoals({ kcal: 2200, protein: 150 }, db);
    await saveGoals({ kcal: 2000 }, db);
    expect(await getGoals(db)).toEqual({ kcal: 2000 });
  });
});

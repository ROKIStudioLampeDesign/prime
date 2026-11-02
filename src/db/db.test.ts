import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LocalDate } from '../domain/date';
import { PrimeDB } from './db';
import { createFood, deleteFood, getFood, updateFood } from './foods';
import { getGoals, saveGoals } from './goals';
import { addEntry, deleteEntry, listEntriesForDate, listRecentFoods, updateEntry } from './logEntries';

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
    expect(db.verno).toBe(2);
  });

  it('migrates v1 → v2 keeping settings', async () => {
    const dbName = `prime-migration-${name}`;
    const v1 = new Dexie(dbName);
    v1.version(1).stores({ settings: 'key' });
    await v1.table('settings').put({ key: 'storagePersisted', value: true, updatedAt: 0 });
    v1.close();

    db = new PrimeDB(dbName);
    expect((await db.settings.get('storagePersisted'))?.value).toBe(true);
    expect(await db.foods.count()).toBe(0);
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
    expect(entry).toMatchObject({ id: entryId, foodName: 'Avoine', grams: 50 });
    expect(entry?.macros.kcal).toBe(186);

    await deleteFood(foodId, db);
    await updateEntry(entryId, { grams: 100, slot: 'snack' }, db);
    [entry] = await listEntriesForDate(DAY, db);
    expect(entry).toMatchObject({ grams: 100, slot: 'snack', foodName: 'Avoine' });
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

    expect(await listRecentFoods(10, db)).toEqual([
      { foodId: 1, lastGrams: 30 },
      { foodId: 2, lastGrams: 20 },
    ]);
    expect(await listRecentFoods(1, db)).toHaveLength(1);
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

import type { LocalDate } from '../domain/date';
import { computeMacros, type MealSlot } from '../domain/nutrition';
import { db, type Food, type LogEntry, type PrimeDB } from './db';

export function listEntriesForDate(date: LocalDate, database: PrimeDB = db): Promise<LogEntry[]> {
  return database.logEntries.where('date').equals(date).sortBy('createdAt');
}

export function getEntry(id: number, database: PrimeDB = db): Promise<LogEntry | undefined> {
  return database.logEntries.get(id);
}

export interface AddEntryInput {
  date: LocalDate;
  slot: MealSlot;
  food: Pick<Food, 'id' | 'name' | 'brand' | 'per100g'>;
  grams: number;
}

export async function addEntry(input: AddEntryInput, database: PrimeDB = db): Promise<number> {
  const now = Date.now();
  const { food } = input;
  return database.logEntries.add({
    date: input.date,
    slot: input.slot,
    foodId: food.id,
    grams: input.grams,
    foodName: food.name,
    ...(food.brand !== undefined && { foodBrand: food.brand }),
    per100g: { ...food.per100g },
    macros: computeMacros(food.per100g, input.grams),
    createdAt: now,
    updatedAt: now,
  });
}

/** Changes the quantity or meal of an entry. Macros are recomputed from the entry's own snapshot. */
export async function updateEntry(
  id: number,
  changes: { grams?: number; slot?: MealSlot },
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction('rw', database.logEntries, async () => {
    const entry = await database.logEntries.get(id);
    if (!entry) return;
    const grams = changes.grams ?? entry.grams;
    await database.logEntries.update(id, {
      grams,
      slot: changes.slot ?? entry.slot,
      macros: computeMacros(entry.per100g, grams),
      updatedAt: Date.now(),
    });
  });
}

export async function deleteEntry(id: number, database: PrimeDB = db): Promise<void> {
  await database.logEntries.delete(id);
}

export interface RecentFood {
  foodId: number;
  lastGrams: number;
}

/** Distinct foods from the most recent log entries, most recent first, with the last quantity used. */
export async function listRecentFoods(limit = 30, database: PrimeDB = db): Promise<RecentFood[]> {
  const recent: RecentFood[] = [];
  const seen = new Set<number>();
  await database.logEntries
    .orderBy('createdAt')
    .reverse()
    .until(() => recent.length >= limit)
    .each((entry) => {
      if (seen.has(entry.foodId)) return;
      seen.add(entry.foodId);
      recent.push({ foodId: entry.foodId, lastGrams: entry.grams });
    });
  return recent;
}

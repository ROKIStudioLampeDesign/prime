import type { LocalDate } from '../domain/date';
import { servingGrams, type MealSummary, type Serving } from '../domain/meal';
import { computeMacros, type Macros, type MealSlot } from '../domain/nutrition';
import type { DayKcal } from '../domain/streaks';
import {
  db,
  type Food,
  type FoodLogEntry,
  type LogEntry,
  type Meal,
  type MealLogEntry,
  type PrimeDB,
  type QuickLogEntry,
  type WeighedLogEntry,
} from './db';

export function listEntriesForDate(date: LocalDate, database: PrimeDB = db): Promise<LogEntry[]> {
  return database.logEntries.where('date').equals(date).sortBy('createdAt');
}

/** Calories and number of entries per logged day (days without entries are absent). */
export async function listDailyKcal(database: PrimeDB = db): Promise<Map<LocalDate, DayKcal>> {
  const out = new Map<LocalDate, DayKcal>();
  await database.logEntries.each((e) => {
    const day = out.get(e.date) ?? { kcal: 0, entries: 0 };
    day.kcal += e.macros.kcal;
    day.entries += 1;
    out.set(e.date, day);
  });
  return out;
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
  // Typed per variant first: Dexie's insert type collapses the LogEntry union.
  const entry: Omit<FoodLogEntry, 'id'> = {
    kind: 'food',
    date: input.date,
    slot: input.slot,
    foodId: food.id,
    grams: input.grams,
    name: food.name,
    ...(food.brand !== undefined && { brand: food.brand }),
    per100g: { ...food.per100g },
    macros: computeMacros(food.per100g, input.grams),
    createdAt: now,
    updatedAt: now,
  };
  return database.logEntries.add(entry);
}

export interface AddMealEntryInput {
  date: LocalDate;
  slot: MealSlot;
  meal: Pick<Meal, 'id' | 'name'>;
  /** Computed from the meal's current ingredients; snapshotted into the entry. */
  summary: MealSummary;
  serving: Serving;
}

export async function addMealEntry(input: AddMealEntryInput, database: PrimeDB = db): Promise<number> {
  const { summary, serving } = input;
  if (!summary.per100g) throw new Error('Cannot log a meal that weighs nothing');
  const grams = servingGrams(serving, summary.portionGrams);
  const now = Date.now();
  const entry: Omit<MealLogEntry, 'id'> = {
    kind: 'meal',
    date: input.date,
    slot: input.slot,
    mealId: input.meal.id,
    grams,
    ...('portions' in serving && { portions: serving.portions }),
    portionGrams: summary.portionGrams,
    name: input.meal.name,
    per100g: { ...summary.per100g },
    macros: computeMacros(summary.per100g, grams),
    createdAt: now,
    updatedAt: now,
  };
  return database.logEntries.add(entry);
}

export interface QuickEntryInput {
  date: LocalDate;
  slot: MealSlot;
  /** Shown in the diary; "Ajout rapide" when left empty. */
  name: string;
  macros: Macros;
}

export const QUICK_ENTRY_NAME = 'Ajout rapide';

/** Logs calories and macros typed in directly, without a product (a restaurant meal…). */
export async function addQuickEntry(input: QuickEntryInput, database: PrimeDB = db): Promise<number> {
  const now = Date.now();
  const entry: Omit<QuickLogEntry, 'id'> = {
    kind: 'quick',
    date: input.date,
    slot: input.slot,
    name: input.name.trim() || QUICK_ENTRY_NAME,
    macros: { ...input.macros },
    createdAt: now,
    updatedAt: now,
  };
  return database.logEntries.add(entry);
}

/** Replaces the name, macros and meal slot of a quick entry (other entries are left alone). */
export async function updateQuickEntry(
  id: number,
  changes: Omit<QuickEntryInput, 'date'>,
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction('rw', database.logEntries, async () => {
    const entry = await database.logEntries.get(id);
    if (entry?.kind !== 'quick') return;
    await database.logEntries.update(id, {
      name: changes.name.trim() || QUICK_ENTRY_NAME,
      macros: { ...changes.macros },
      slot: changes.slot,
      updatedAt: Date.now(),
    });
  });
}

/**
 * Changes the quantity or meal slot of an entry. Macros are recomputed from the entry's own
 * snapshot, never from the current food or meal. `portions` only applies to meal entries; setting
 * `grams` on a meal entry switches it to "logged by grams".
 */
export async function updateEntry(
  id: number,
  changes: { grams?: number; portions?: number; slot?: MealSlot },
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction('rw', database.logEntries, async () => {
    const entry = await database.logEntries.get(id);
    if (!entry || entry.kind === 'quick') return;
    let grams = changes.grams ?? entry.grams;
    let portions = entry.kind === 'meal' ? entry.portions : undefined;
    if (entry.kind === 'meal') {
      if (changes.portions !== undefined) {
        portions = changes.portions;
        grams = servingGrams({ portions }, entry.portionGrams);
      } else if (changes.grams !== undefined) {
        portions = undefined;
      }
    }
    // Typed as a weighed entry: Dexie's update type collapses the LogEntry union.
    await database.table<WeighedLogEntry, number>('logEntries').update(id, {
      grams,
      ...(entry.kind === 'meal' && { portions }),
      slot: changes.slot ?? entry.slot,
      macros: computeMacros(entry.per100g, grams),
      updatedAt: Date.now(),
    });
  });
}

export async function deleteEntry(id: number, database: PrimeDB = db): Promise<void> {
  await database.logEntries.delete(id);
}

export type RecentItem =
  | { kind: 'food'; id: number; lastGrams: number }
  | { kind: 'meal'; id: number; lastGrams: number; lastPortions?: number };

export const itemKey = (kind: 'food' | 'meal', id: number) => `${kind}:${id}`;

/** Distinct foods and meals from the most recent entries, most recent first, with the last quantity. */
export async function listRecentItems(limit = 30, database: PrimeDB = db): Promise<RecentItem[]> {
  const recent: RecentItem[] = [];
  const seen = new Set<string>();
  await database.logEntries
    .orderBy('createdAt')
    .reverse()
    .until(() => recent.length >= limit)
    .each((entry) => {
      // Quick entries have no product to pick again.
      if (entry.kind === 'quick') return;
      const id = entry.kind === 'meal' ? entry.mealId : entry.foodId;
      const key = itemKey(entry.kind, id);
      if (seen.has(key)) return;
      seen.add(key);
      recent.push(
        entry.kind === 'meal'
          ? { kind: 'meal', id, lastGrams: entry.grams, lastPortions: entry.portions }
          : { kind: 'food', id, lastGrams: entry.grams },
      );
    });
  return recent;
}

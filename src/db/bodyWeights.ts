import { validateBodyWeight } from '../domain/bodyWeight';
import type { LocalDate } from '../domain/date';
import { db, type BodyWeightEntry, type PrimeDB } from './db';

/** All weigh-ins, oldest first. */
export function listBodyWeights(database: PrimeDB = db): Promise<BodyWeightEntry[]> {
  return database.bodyWeights.orderBy('date').toArray();
}

/** Saves the weigh-in of a day, replacing that day's value if there is one. Returns its id. */
export async function upsertBodyWeight(date: LocalDate, kg: number, database: PrimeDB = db): Promise<number> {
  const value = validateBodyWeight(kg);
  if (value === undefined) throw new Error(`Implausible body weight: ${kg}`);
  return database.transaction('rw', database.bodyWeights, async () => {
    const now = Date.now();
    const existing = await database.bodyWeights.where('date').equals(date).first();
    if (existing) {
      await database.bodyWeights.update(existing.id, { kg: value, updatedAt: now });
      return existing.id;
    }
    return database.bodyWeights.add({ date, kg: value, createdAt: now, updatedAt: now });
  });
}

export async function deleteBodyWeight(id: number, database: PrimeDB = db): Promise<void> {
  await database.bodyWeights.delete(id);
}

const TARGET_KEY = 'targetWeightKg';

export async function getTargetWeight(database: PrimeDB = db): Promise<number | undefined> {
  const value = (await database.settings.get(TARGET_KEY))?.value;
  return typeof value === 'number' ? value : undefined;
}

/** Sets (or clears, with undefined) the optional target weight shown on the chart. */
export async function setTargetWeight(kg: number | undefined, database: PrimeDB = db): Promise<void> {
  if (kg === undefined) {
    await database.settings.delete(TARGET_KEY);
    return;
  }
  const value = validateBodyWeight(kg);
  if (value === undefined) throw new Error(`Implausible target weight: ${kg}`);
  await database.settings.put({ key: TARGET_KEY, value, updatedAt: Date.now() });
}

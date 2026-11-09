import type { LocalDate } from '../domain/date';
import type { UnloggedStatus } from '../domain/nutrition';
import { db, type PrimeDB } from './db';

/** Days whose meals weren't counted, by date. */
export async function listUnloggedDays(database: PrimeDB = db): Promise<Map<LocalDate, UnloggedStatus>> {
  const rows = await database.nutritionDays.toArray();
  return new Map(rows.map((r) => [r.date, r.status]));
}

export async function getUnloggedDay(
  date: LocalDate,
  database: PrimeDB = db,
): Promise<UnloggedStatus | undefined> {
  return (await database.nutritionDays.get(date))?.status;
}

/** Marks a day as not counted (under or over the goal), or clears the mark with `undefined`. */
export async function setUnloggedDay(
  date: LocalDate,
  status: UnloggedStatus | undefined,
  database: PrimeDB = db,
): Promise<void> {
  if (status === undefined) await database.nutritionDays.delete(date);
  else await database.nutritionDays.put({ date, status, updatedAt: Date.now() });
}

import type { LocalDate } from '../domain/date';
import { db, type GymDay, type PrimeDB } from './db';
import { getSetting, setSetting } from './settings';

export function listGymDays(database: PrimeDB = db): Promise<GymDay[]> {
  return database.gymDays.toArray();
}

export function getGymDay(date: LocalDate, database: PrimeDB = db): Promise<GymDay | undefined> {
  return database.gymDays.get(date);
}

/**
 * Manual attendance for a day (days with a workout count as attended regardless). Marking a day
 * attended clears its rest mark: the two are exclusive.
 */
export async function setGymDay(date: LocalDate, attended: boolean, database: PrimeDB = db): Promise<void> {
  await database.gymDays.put({ date, attended });
}

/** Marks or unmarks a planned rest day. Marking it clears a manual attendance mark. */
export async function setRestDay(date: LocalDate, rest: boolean, database: PrimeDB = db): Promise<void> {
  await database.gymDays.put(rest ? { date, attended: false, rest: true } : { date, attended: false });
}

/** Marks or unmarks a "jour rouge". Marking it clears manual attendance and the rest mark. */
export async function setRedDay(date: LocalDate, red: boolean, database: PrimeDB = db): Promise<void> {
  await database.gymDays.put(red ? { date, attended: false, red: true } : { date, attended: false });
}

const REST_SECONDS_KEY = 'restTimerSeconds';
export const DEFAULT_REST_SECONDS = 120;
export const REST_OPTIONS = [0, 60, 90, 120, 180] as const;

/** Rest timer duration in seconds; 0 disables the automatic timer. */
export async function getRestSeconds(): Promise<number> {
  return (await getSetting<number>(REST_SECONDS_KEY)) ?? DEFAULT_REST_SECONDS;
}

export async function setRestSeconds(seconds: number): Promise<void> {
  await setSetting(REST_SECONDS_KEY, seconds);
}

const WEEKLY_TARGET_KEY = 'weeklyGymTarget';
/** Gym days per Monday–Sunday week for the weekly streak. */
export const DEFAULT_WEEKLY_TARGET = 5;
export const WEEKLY_TARGET_OPTIONS = [2, 3, 4, 5, 6, 7] as const;

export async function getWeeklyTarget(): Promise<number> {
  const value = await getSetting<unknown>(WEEKLY_TARGET_KEY);
  return typeof value === 'number' && value >= 1 && value <= 7 ? value : DEFAULT_WEEKLY_TARGET;
}

export async function setWeeklyTarget(days: number): Promise<void> {
  await setSetting(WEEKLY_TARGET_KEY, days);
}

import type { LocalDate } from '../domain/date';
import { db, type GymDay, type PrimeDB } from './db';
import { getSetting, setSetting } from './settings';

export function listGymDays(database: PrimeDB = db): Promise<GymDay[]> {
  return database.gymDays.toArray();
}

/** Manual attendance for a day (days with a workout count as attended regardless). */
export async function setGymDay(date: LocalDate, attended: boolean, database: PrimeDB = db): Promise<void> {
  await database.gymDays.put({ date, attended });
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

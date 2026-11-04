import { getSetting, setSetting } from './settings';

const BENCH_GOAL_KEY = 'benchGoalKg';

/** One-rep bench goal in kg, undefined when none is set. */
export async function getBenchGoalKg(): Promise<number | undefined> {
  const value = await getSetting<unknown>(BENCH_GOAL_KEY);
  return typeof value === 'number' && value > 0 ? value : undefined;
}

/** Sets the bench goal; undefined (or 0) removes it. */
export async function setBenchGoalKg(kg: number | undefined): Promise<void> {
  await setSetting(BENCH_GOAL_KEY, kg !== undefined && kg > 0 ? kg : undefined);
}

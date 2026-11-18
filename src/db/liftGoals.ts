import type { LiftId } from '../domain/lifts';
import { getSetting, setSetting } from './settings';

/** The bench keeps the key it had before other lifts could have a goal. */
function goalKey(lift: LiftId): string {
  return lift === 'bench' ? 'benchGoalKg' : `liftGoalKg.${lift}`;
}

/** One-rep goal in kg for a lift, undefined when none is set. */
export async function getLiftGoalKg(lift: LiftId): Promise<number | undefined> {
  const value = await getSetting<unknown>(goalKey(lift));
  return typeof value === 'number' && value > 0 ? value : undefined;
}

/** Sets a lift's goal; undefined (or 0) removes it. */
export async function setLiftGoalKg(lift: LiftId, kg: number | undefined): Promise<void> {
  await setSetting(goalKey(lift), kg !== undefined && kg > 0 ? kg : undefined);
}

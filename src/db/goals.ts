import { MACRO_KEYS, type Goals } from '../domain/nutrition';
import { db, type PrimeDB } from './db';

/** The user's goals, or `{}` when none were ever set. */
export async function getGoals(database: PrimeDB = db): Promise<Goals> {
  const record = await database.goals.get('default');
  const goals: Goals = {};
  for (const key of MACRO_KEYS) {
    const value = record?.[key];
    if (value !== undefined) goals[key] = value;
  }
  return goals;
}

/** Replaces all goals; nutrients absent from `goals` have no goal afterwards. */
export async function saveGoals(goals: Goals, database: PrimeDB = db): Promise<void> {
  await database.goals.put({ ...goals, id: 'default', updatedAt: Date.now() });
}

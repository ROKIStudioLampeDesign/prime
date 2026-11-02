import type { LocalDate } from '../domain/date';
import { DEFAULT_THRESHOLDS, validateThresholds, type RecencyThresholds } from '../domain/muscleRecency';
import { db, type PrimeDB } from './db';

export interface BodyMapSettings extends RecencyThresholds {
  countSecondary: boolean;
}

export const DEFAULT_BODY_MAP_SETTINGS: Readonly<BodyMapSettings> = {
  ...DEFAULT_THRESHOLDS,
  countSecondary: true,
};

const KEY = 'bodyMap';

/** Stored settings, falling back to defaults for missing or invalid values. */
export async function getBodyMapSettings(database: PrimeDB = db): Promise<BodyMapSettings> {
  const stored = (await database.settings.get(KEY))?.value as Partial<BodyMapSettings> | undefined;
  const merged = { ...DEFAULT_BODY_MAP_SETTINGS, ...stored };
  const thresholds = validateThresholds(merged) ? merged : DEFAULT_THRESHOLDS;
  return {
    greenDays: thresholds.greenDays,
    redDays: thresholds.redDays,
    countSecondary: typeof merged.countSecondary === 'boolean' ? merged.countSecondary : true,
  };
}

/** Saves the settings; invalid thresholds (green ≥ red…) are rejected. */
export async function saveBodyMapSettings(settings: BodyMapSettings, database: PrimeDB = db): Promise<void> {
  if (!validateThresholds(settings)) throw new Error('greenDays must be an integer ≥ 0 and < redDays');
  await database.settings.put({
    key: KEY,
    value: {
      greenDays: settings.greenDays,
      redDays: settings.redDays,
      countSecondary: settings.countSecondary,
    },
    updatedAt: Date.now(),
  });
}

/** Every completed set with its workout's date (active workouts included: training today counts). */
export async function listCompletedSetDates(
  database: PrimeDB = db,
): Promise<{ date: LocalDate; exerciseId: number }[]> {
  const [workouts, sets] = await Promise.all([database.workouts.toArray(), database.workoutSets.toArray()]);
  const dateById = new Map(workouts.map((w) => [w.id, w.date]));
  return sets.flatMap((s) => {
    const date = dateById.get(s.workoutId);
    return s.completed && date ? [{ date, exerciseId: s.exerciseId }] : [];
  });
}

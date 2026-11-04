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

/** Shape stored before the colours were inverted (green was "fresh"): same numbers, old names. */
interface LegacyThresholds {
  greenDays?: unknown;
  redDays?: unknown;
}

/** Stored settings, falling back to defaults for missing or invalid values. */
export async function getBodyMapSettings(database: PrimeDB = db): Promise<BodyMapSettings> {
  const stored = (await database.settings.get(KEY))?.value as
    (Partial<BodyMapSettings> & LegacyThresholds) | undefined;
  const candidate = {
    freshDays: stored?.freshDays ?? stored?.greenDays ?? DEFAULT_THRESHOLDS.freshDays,
    staleDays: stored?.staleDays ?? stored?.redDays ?? DEFAULT_THRESHOLDS.staleDays,
  } as RecencyThresholds;
  const thresholds = validateThresholds(candidate) ? candidate : DEFAULT_THRESHOLDS;
  return {
    freshDays: thresholds.freshDays,
    staleDays: thresholds.staleDays,
    countSecondary: typeof stored?.countSecondary === 'boolean' ? stored.countSecondary : true,
  };
}

/** Saves the settings; invalid thresholds (green ≥ red…) are rejected. */
export async function saveBodyMapSettings(settings: BodyMapSettings, database: PrimeDB = db): Promise<void> {
  if (!validateThresholds(settings)) throw new Error('freshDays must be an integer ≥ 0 and < staleDays');
  await database.settings.put({
    key: KEY,
    value: {
      freshDays: settings.freshDays,
      staleDays: settings.staleDays,
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

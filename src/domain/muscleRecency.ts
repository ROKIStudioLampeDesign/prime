import { differenceInCalendarDays } from 'date-fns';
import { addDays, fromLocalDate, type LocalDate } from './date';
import { MUSCLE_IDS, type MuscleId } from './muscles';

/** One completed set, with the date of its workout and the muscles of its exercise. */
export interface TrainingRecord {
  date: LocalDate;
  exerciseId: number;
  primary: readonly MuscleId[];
  secondary: readonly MuscleId[];
}

export interface RecencyOptions {
  /** Whether a muscle used as a secondary mover counts as trained. */
  countSecondary: boolean;
}

export interface RecencyThresholds {
  /** Up to this many days since training: full green. */
  greenDays: number;
  /** From this many days: full red. */
  redDays: number;
}

export const DEFAULT_THRESHOLDS: Readonly<RecencyThresholds> = { greenDays: 2, redDays: 10 };

/** Color of a muscle that was never trained. */
export const NEUTRAL_COLOR = 'hsl(0 0% 55%)';

const SATURATION = 70;
const LIGHTNESS = 46;

export function worksMuscle(record: TrainingRecord, muscle: MuscleId, options: RecencyOptions): boolean {
  return record.primary.includes(muscle) || (options.countSecondary && record.secondary.includes(muscle));
}

/** Most recent workout date with a completed set that worked the muscle. */
export function lastTrainedDate(
  muscle: MuscleId,
  records: readonly TrainingRecord[],
  options: RecencyOptions,
): LocalDate | undefined {
  let last: LocalDate | undefined;
  for (const r of records) {
    if ((last === undefined || r.date > last) && worksMuscle(r, muscle, options)) last = r.date;
  }
  return last;
}

/** Whole calendar days between `date` and `today` (0 = today; future dates count as 0). */
export function daysSince(date: LocalDate | undefined, today: LocalDate): number | undefined {
  if (date === undefined) return undefined;
  return Math.max(0, differenceInCalendarDays(fromLocalDate(today), fromLocalDate(date)));
}

export function validateThresholds(t: RecencyThresholds): boolean {
  return (
    Number.isInteger(t.greenDays) &&
    Number.isInteger(t.redDays) &&
    t.greenDays >= 0 &&
    t.greenDays < t.redDays
  );
}

/** Hue from 120 (green) to 0 (red) as days go from greenDays to redDays. */
export function hueFor(days: number, { greenDays, redDays }: RecencyThresholds): number {
  if (days <= greenDays) return 120;
  if (days >= redDays) return 0;
  return 120 * (1 - (days - greenDays) / (redDays - greenDays));
}

/**
 * Map color for a muscle trained `days` ago: green up to `greenDays`, red from `redDays`, a smooth
 * hue gradient in between, neutral grey when never trained. Invalid thresholds fall back to the
 * defaults rather than producing nonsense.
 */
export function colorFor(days: number | undefined, thresholds: RecencyThresholds): string {
  if (days === undefined) return NEUTRAL_COLOR;
  const t = validateThresholds(thresholds) ? thresholds : DEFAULT_THRESHOLDS;
  return `hsl(${Math.round(hueFor(days, t) * 10) / 10} ${SATURATION}% ${LIGHTNESS}%)`;
}

export interface MuscleRecency {
  lastDate?: LocalDate;
  days?: number;
}

/** Recency of every muscle at once. */
export function muscleRecency(
  records: readonly TrainingRecord[],
  today: LocalDate,
  options: RecencyOptions,
): Record<MuscleId, MuscleRecency> {
  const out = Object.fromEntries(MUSCLE_IDS.map((m) => [m, {}])) as Record<MuscleId, MuscleRecency>;
  for (const r of records) {
    const muscles = options.countSecondary ? [...r.primary, ...r.secondary] : r.primary;
    for (const m of muscles) {
      const entry = out[m];
      if (entry.lastDate === undefined || r.date > entry.lastDate) entry.lastDate = r.date;
    }
  }
  for (const m of MUSCLE_IDS) out[m].days = daysSince(out[m].lastDate, today);
  return out;
}

/** The last `limit` distinct exercises that worked the muscle, most recent first. */
export function recentExercises(
  muscle: MuscleId,
  records: readonly TrainingRecord[],
  options: RecencyOptions,
  limit = 3,
): { exerciseId: number; date: LocalDate; asSecondary: boolean }[] {
  const latest = new Map<number, { date: LocalDate; asSecondary: boolean }>();
  for (const r of records) {
    if (!worksMuscle(r, muscle, options)) continue;
    const prev = latest.get(r.exerciseId);
    if (!prev || r.date > prev.date)
      latest.set(r.exerciseId, { date: r.date, asSecondary: !r.primary.includes(muscle) });
  }
  return [...latest.entries()]
    .map(([exerciseId, v]) => ({ exerciseId, ...v }))
    .sort((a, b) => (a.date === b.date ? a.exerciseId - b.exerciseId : a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

/** Completed sets that worked the muscle in the last `days` days, today included. */
export function setsInLastDays(
  muscle: MuscleId,
  records: readonly TrainingRecord[],
  today: LocalDate,
  days: number,
  options: RecencyOptions,
): number {
  const from = addDays(today, -(days - 1));
  return records.filter((r) => r.date >= from && r.date <= today && worksMuscle(r, muscle, options)).length;
}

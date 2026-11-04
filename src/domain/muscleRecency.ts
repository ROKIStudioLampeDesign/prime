import { addDays, daysBetween, type LocalDate } from './date';
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
  /** Up to this many days since training: fully "fresh" (red). */
  freshDays: number;
  /** From this many days: fully recovered / stale (green). */
  staleDays: number;
}

export const DEFAULT_THRESHOLDS: Readonly<RecencyThresholds> = { freshDays: 2, staleDays: 10 };

/**
 * How much a set counts for a muscle that is only a secondary mover of the exercise (e.g. triceps
 * at the bench): half of a primary muscle, so helpers never look as worked as the target.
 */
export const SECONDARY_WEIGHT = 0.5;

/** Color of a muscle that was never trained. */
export const NEUTRAL_COLOR = 'hsl(0 0% 55%)';

const SATURATION = 70;
const LIGHTNESS = 46;

export function worksMuscle(record: TrainingRecord, muscle: MuscleId, options: RecencyOptions): boolean {
  return record.primary.includes(muscle) || (options.countSecondary && record.secondary.includes(muscle));
}

/** Weight of a record for a muscle: 1 primary, SECONDARY_WEIGHT secondary (if counted), else 0. */
export function muscleWeight(record: TrainingRecord, muscle: MuscleId, options: RecencyOptions): number {
  if (record.primary.includes(muscle)) return 1;
  return options.countSecondary && record.secondary.includes(muscle) ? SECONDARY_WEIGHT : 0;
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
  return Math.max(0, daysBetween(date, today));
}

export function validateThresholds(t: RecencyThresholds): boolean {
  return (
    Number.isInteger(t.freshDays) &&
    Number.isInteger(t.staleDays) &&
    t.freshDays >= 0 &&
    t.freshDays < t.staleDays
  );
}

/** 1 up to freshDays, 0 from staleDays, linear in between. Invalid thresholds use the defaults. */
export function freshness(days: number, thresholds: RecencyThresholds): number {
  const { freshDays, staleDays } = validateThresholds(thresholds) ? thresholds : DEFAULT_THRESHOLDS;
  if (days <= freshDays) return 1;
  if (days >= staleDays) return 0;
  return 1 - (days - freshDays) / (staleDays - freshDays);
}

/** Hue from 0 (red, intensity 1: just trained) to 120 (green, intensity 0: long ago). */
export function hueFor(intensity: number): number {
  return 120 * (1 - Math.min(1, Math.max(0, intensity)));
}

/** Map color for an intensity (0–1); neutral grey when the muscle was never trained. */
export function colorForIntensity(intensity: number | undefined): string {
  if (intensity === undefined) return NEUTRAL_COLOR;
  return `hsl(${Math.round(hueFor(intensity) * 10) / 10} ${SATURATION}% ${LIGHTNESS}%)`;
}

/**
 * Color of a muscle trained as the primary mover `days` ago: red up to `freshDays`, green from
 * `staleDays`, a smooth hue gradient in between, neutral grey when never trained.
 */
export function colorFor(days: number | undefined, thresholds: RecencyThresholds): string {
  return colorForIntensity(days === undefined ? undefined : freshness(days, thresholds));
}

export interface MuscleRecency {
  lastDate?: LocalDate;
  days?: number;
  /**
   * 0–1: the strongest recent work on the muscle, each set weighted by its role (primary 1,
   * secondary SECONDARY_WEIGHT) and by its freshness. Undefined when never trained.
   */
  intensity?: number;
}

/** Recency of every muscle at once. */
export function muscleRecency(
  records: readonly TrainingRecord[],
  today: LocalDate,
  options: RecencyOptions,
  thresholds: RecencyThresholds = DEFAULT_THRESHOLDS,
): Record<MuscleId, MuscleRecency> {
  const out = Object.fromEntries(MUSCLE_IDS.map((m) => [m, {}])) as Record<MuscleId, MuscleRecency>;
  for (const r of records) {
    const days = daysSince(r.date, today) ?? 0;
    const muscles = options.countSecondary ? [...r.primary, ...r.secondary] : r.primary;
    for (const m of muscles) {
      const entry = out[m];
      if (entry.lastDate === undefined || r.date > entry.lastDate) entry.lastDate = r.date;
      const value = muscleWeight(r, m, options) * freshness(days, thresholds);
      entry.intensity = Math.max(entry.intensity ?? 0, value);
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

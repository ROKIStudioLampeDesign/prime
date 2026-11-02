import { addDays, type LocalDate } from './date';

export interface WeightPoint {
  date: LocalDate;
  kg: number;
}

export const MIN_BODY_WEIGHT_KG = 20;
export const MAX_BODY_WEIGHT_KG = 400;

/** Rounds to 0.1 kg; undefined when not a plausible body weight. */
export function validateBodyWeight(kg: number): number | undefined {
  if (!Number.isFinite(kg) || kg < MIN_BODY_WEIGHT_KG || kg > MAX_BODY_WEIGHT_KG) return undefined;
  return Math.round(kg * 10) / 10;
}

/**
 * Trailing moving average over a window of `windowDays` calendar days (the point's day included).
 * Gaps are handled by averaging only the weigh-ins that fall inside the window, so a missing day
 * neither counts as 0 nor pulls in older data. Output is sorted by date, one value per input point.
 */
export function movingAverage(points: readonly WeightPoint[], windowDays = 7): WeightPoint[] {
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let from = 0;
  let sum = 0;
  return sorted.map((p, i) => {
    sum += p.kg;
    const windowStart = addDays(p.date, -(windowDays - 1));
    while (from < i && (sorted[from]?.date ?? '') < windowStart) {
      sum -= sorted[from]?.kg ?? 0;
      from++;
    }
    return { date: p.date, kg: sum / (i - from + 1) };
  });
}

export type WeightRange = '1M' | '3M' | '6M' | 'all';

/** First day included in a range ending today; undefined for "all". */
export function rangeStart(range: WeightRange, today: LocalDate): LocalDate | undefined {
  const days = { '1M': 30, '3M': 91, '6M': 182 } as const;
  return range === 'all' ? undefined : addDays(today, -(days[range] - 1));
}

export function pointsInRange(
  points: readonly WeightPoint[],
  range: WeightRange,
  today: LocalDate,
): WeightPoint[] {
  const start = rangeStart(range, today);
  return points.filter((p) => (start === undefined || p.date >= start) && p.date <= today);
}

export interface WeightSummary {
  current: WeightPoint;
  /** Last minus first weigh-in of the range (0 with a single point). */
  change: number;
  min: WeightPoint;
  max: WeightPoint;
}

/** Summary of the points (any order); undefined when empty. */
export function summarizeWeights(points: readonly WeightPoint[]): WeightSummary | undefined {
  if (points.length === 0) return undefined;
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
  const first = sorted[0] as WeightPoint;
  const last = sorted[sorted.length - 1] as WeightPoint;
  let min = first;
  let max = first;
  for (const p of sorted) {
    if (p.kg < min.kg) min = p;
    if (p.kg > max.kg) max = p;
  }
  return { current: last, change: Math.round((last.kg - first.kg) * 10) / 10, min, max };
}

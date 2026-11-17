import { addDays, daysBetween, type LocalDate } from './date';
import type { HistorySet } from './strength';

/** The best set of an exercise over a period, as compared in Stats › Semaine › Perfs. */
export interface BestSet {
  weightKg: number;
  reps: number;
  /** Bodyweight set (0 kg): compared on reps instead of estimated strength. */
  bodyweight: boolean;
  /** Estimated 1RM in kg (Epley, uncapped), or reps for a bodyweight set. */
  score: number;
}

export type Trend = 'up' | 'same' | 'down' | 'new';

export interface PerfComparison {
  exerciseId: number;
  /** Undefined when there is nothing to compare with (first time in the period pair). */
  before?: BestSet;
  after: BestSet;
  /** Change of estimated 1RM (kg), or of reps for bodyweight sets; undefined if not comparable. */
  delta?: number;
  trend: Trend;
}

/** Below this, a change is noise (kg of estimated 1RM, or reps). */
const SAME_EPSILON = 0.05;

function score(weightKg: number, reps: number): number {
  if (weightKg > 0) return reps > 1 ? weightKg * (1 + reps / 30) : weightKg;
  return reps;
}

/**
 * The best set among `sets`: weighted sets win over bodyweight ones, then the highest estimated
 * 1RM (or the most reps at bodyweight). Undefined without sets with at least one rep.
 */
export function bestSet(sets: readonly Pick<HistorySet, 'weightKg' | 'reps'>[]): BestSet | undefined {
  let best: BestSet | undefined;
  for (const s of sets) {
    if (!(s.reps > 0)) continue;
    const candidate: BestSet = {
      weightKg: s.weightKg,
      reps: s.reps,
      bodyweight: !(s.weightKg > 0),
      score: score(s.weightKg, s.reps),
    };
    if (
      !best ||
      (best.bodyweight && !candidate.bodyweight) ||
      (best.bodyweight === candidate.bodyweight && candidate.score > best.score)
    ) {
      best = candidate;
    }
  }
  return best;
}

function compare(exerciseId: number, before: BestSet | undefined, after: BestSet): PerfComparison {
  if (!before) return { exerciseId, after, trend: 'new' };
  if (before.bodyweight !== after.bodyweight) return { exerciseId, before, after, trend: 'same' };
  const delta = after.score - before.score;
  const trend = delta > SAME_EPSILON ? 'up' : delta < -SAME_EPSILON ? 'down' : 'same';
  return { exerciseId, before, after, delta, trend };
}

const inRange = (date: LocalDate, from: LocalDate, to: LocalDate) => date >= from && date <= to;

/**
 * Every exercise done in [from, to]: its best set there against its best set in
 * [prevFrom, prevTo] (e.g. this week against last week).
 */
export function comparePeriods(
  history: ReadonlyMap<number, readonly HistorySet[]>,
  period: { from: LocalDate; to: LocalDate },
  previous: { from: LocalDate; to: LocalDate },
): PerfComparison[] {
  const out: PerfComparison[] = [];
  for (const [exerciseId, sets] of history) {
    const after = bestSet(sets.filter((s) => inRange(s.date, period.from, period.to)));
    if (!after) continue;
    out.push(
      compare(exerciseId, bestSet(sets.filter((s) => inRange(s.date, previous.from, previous.to))), after),
    );
  }
  return out;
}

/** "A month before" the last session: this many days earlier. */
export const MONTH_DAYS = 30;
/** A session counts as "a month before" only if it is at least this many days older. */
export const MIN_GAP_DAYS = 21;

/**
 * Every exercise done up to `until`: its best set in its last session against its best set in
 * the session closest to a month before that one (at least `MIN_GAP_DAYS` older; the older one
 * wins a tie). Without such a session, the exercise is new.
 */
export function compareWithMonthBefore(
  history: ReadonlyMap<number, readonly HistorySet[]>,
  until: LocalDate,
): PerfComparison[] {
  const out: PerfComparison[] = [];
  for (const [exerciseId, sets] of history) {
    const upTo = sets.filter((s) => s.date <= until);
    const sessions = [...new Set(upTo.map((s) => s.workoutId))]
      .map((id) => upTo.filter((s) => s.workoutId === id))
      .sort((a, b) => (a[0]?.startedAt ?? 0) - (b[0]?.startedAt ?? 0));
    const last = sessions[sessions.length - 1];
    const lastDate = last?.[0]?.date;
    const after = last && bestSet(last);
    if (!lastDate || !after) continue;
    const target = addDays(lastDate, -MONTH_DAYS);
    const latestAllowed = addDays(lastDate, -MIN_GAP_DAYS);
    let before: (typeof sessions)[number] | undefined;
    let bestGap = Infinity;
    for (const session of sessions) {
      const date = session[0]?.date;
      if (!date || date > latestAllowed) continue;
      const gap = Math.abs(daysBetween(target, date));
      if (gap < bestGap) {
        bestGap = gap;
        before = session;
      }
    }
    out.push(compare(exerciseId, before && bestSet(before), after));
  }
  return out;
}

/** How many exercises went up, stayed, or went down (new ones are left out). */
export function trendCounts(rows: readonly PerfComparison[]): Record<Exclude<Trend, 'new'>, number> {
  return {
    up: rows.filter((r) => r.trend === 'up').length,
    same: rows.filter((r) => r.trend === 'same').length,
    down: rows.filter((r) => r.trend === 'down').length,
  };
}

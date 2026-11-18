import { addDays, type LocalDate } from './date';
import type { UnloggedStatus } from './nutrition';
import { weekStart } from './week';

/** Calories logged on one day (a day without entries has no row). */
export interface DayKcal {
  kcal: number;
  entries: number;
}

export interface CalorieStreak {
  /** Consecutive days at or under the goal, ending today (or yesterday while today is empty). */
  days: number;
  /**
   * Today: 'ok' (logged, under the goal), 'over' (it broke the streak, logged or not), 'skipped'
   * (not counted but under: it neither counts nor breaks) or 'empty' (not yet).
   */
  today: 'ok' | 'over' | 'skipped' | 'empty';
}

/**
 * Consecutive days whose logged calories stay at or under `goal`. A day counts only if something
 * was logged (an empty day is not a success); a day over the goal breaks the streak. Today is
 * still open: empty, it neither counts nor breaks. A day marked as not counted (`unlogged`) wins
 * over its entries: 'over' breaks the streak, 'under' is skipped (neither counts nor breaks).
 */
export function calorieStreak(
  byDay: ReadonlyMap<LocalDate, DayKcal>,
  goal: number,
  today: LocalDate,
  unlogged: ReadonlyMap<LocalDate, UnloggedStatus> = new Map(),
): CalorieStreak {
  const state = (date: LocalDate): CalorieStreak['today'] => {
    const mark = unlogged.get(date);
    if (mark) return mark === 'over' ? 'over' : 'skipped';
    const d = byDay.get(date);
    if (d === undefined || d.entries === 0) return 'empty';
    return d.kcal <= goal ? 'ok' : 'over';
  };
  const todayState = state(today);
  if (todayState === 'over') return { days: 0, today: 'over' };
  let days = todayState === 'ok' ? 1 : 0;
  let cursor = addDays(today, -1);
  for (;;) {
    const s = state(cursor);
    if (s === 'ok') days++;
    else if (s !== 'skipped') break;
    cursor = addDays(cursor, -1);
  }
  return { days, today: todayState };
}

export interface WeekStreak {
  /** Consecutive Monday–Sunday weeks with at least `target` gym days. */
  weeks: number;
  /** Gym days so far this week. */
  thisWeek: number;
  target: number;
}

/**
 * Consecutive weeks (Monday to Sunday) with at least `target` distinct gym days. The current
 * week counts once it reaches the target and never breaks the streak while it is in progress.
 */
export function weekStreak(attended: ReadonlySet<LocalDate>, today: LocalDate, target: number): WeekStreak {
  const perWeek = new Map<LocalDate, number>();
  for (const d of attended) {
    if (d > today) continue;
    const w = weekStart(d);
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  const current = weekStart(today);
  const thisWeek = perWeek.get(current) ?? 0;
  const met = (w: LocalDate) => (perWeek.get(w) ?? 0) >= target;
  let weeks = met(current) ? 1 : 0;
  let cursor = addDays(current, -7);
  while (met(cursor)) {
    weeks++;
    cursor = addDays(cursor, -7);
  }
  return { weeks, thisWeek, target };
}

/** Smallest plate step on a barbell: loads are rounded to it. */
const LOAD_STEP_KG = 2.5;
const roundLoad = (kg: number) => Math.round(kg / LOAD_STEP_KG) * LOAD_STEP_KG;

/** Warm-up ramp before a heavy single: % of the target × reps. */
const WARMUP: readonly (readonly [number, number])[] = [
  [0.5, 5],
  [0.7, 3],
  [0.85, 1],
  [0.92, 1],
];

/**
 * Sets of a bench PR session: the empty bar × 10, a ramp to ~92 % of the target, then one single
 * at the target. Loads are rounded to 2.5 kg; ramp steps that would repeat a load are skipped.
 */
export function prBenchPlan(targetKg: number, barKg = 20): { weightKg: number; reps: number }[] {
  const sets = [{ weightKg: barKg, reps: 10 }];
  for (const [ratio, reps] of WARMUP) {
    const weightKg = roundLoad(targetKg * ratio);
    const last = sets[sets.length - 1];
    if (weightKg > (last?.weightKg ?? 0) && weightKg < targetKg) sets.push({ weightKg, reps });
  }
  sets.push({ weightKg: roundLoad(targetKg), reps: 1 });
  return sets;
}

/** Default PR target: the best lift + 2.5 kg (rounded), or the empty bar with no history. */
export function defaultPrTarget(bestKg: number, barKg = 20): number {
  return bestKg > 0 ? roundLoad(bestKg + LOAD_STEP_KG) : barKg;
}

import { differenceInCalendarDays } from 'date-fns';
import { addDays, fromLocalDate, type LocalDate } from './date';

/** Calendar days from `from` to `to` (negative when `to` is earlier); DST-safe. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return differenceInCalendarDays(fromLocalDate(to), fromLocalDate(from));
}

interface WorkoutLike {
  date: LocalDate;
  status: 'active' | 'done';
  startedAt: number;
}

export type TodayWorkouts<W extends WorkoutLike> =
  | { kind: 'active'; workout: W }
  | { kind: 'done'; workouts: W[] }
  | { kind: 'none'; last?: { workout: W; daysAgo: number } };

/**
 * What the day looks like at the gym: the active workout (resume it), else the workouts done
 * today, else the most recent past one.
 */
export function todayWorkouts<W extends WorkoutLike>(
  workouts: readonly W[],
  today: LocalDate,
): TodayWorkouts<W> {
  const active = workouts.find((w) => w.status === 'active');
  if (active) return { kind: 'active', workout: active };
  const done = workouts.filter((w) => w.date === today).sort((a, b) => a.startedAt - b.startedAt);
  if (done.length > 0) return { kind: 'done', workouts: done };
  const last = workouts
    .filter((w) => w.date < today)
    .reduce<W | undefined>((best, w) => (!best || w.date > best.date ? w : best), undefined);
  return last
    ? { kind: 'none', last: { workout: last, daysAgo: daysBetween(last.date, today) } }
    : { kind: 'none' };
}

interface WeightLike {
  date: LocalDate;
  kg: number;
}

export interface TodayWeight<P extends WeightLike> {
  latest?: P;
  isToday?: boolean;
  daysAgo?: number;
  /** Latest minus the closest weigh-in at least 7 days older; undefined without one. */
  weekChange?: number;
}

export function todayWeight<P extends WeightLike>(points: readonly P[], today: LocalDate): TodayWeight<P> {
  const past = points.filter((p) => p.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const latest = past.at(-1);
  if (!latest) return {};
  const weekBefore = addDays(latest.date, -7);
  const reference = past.findLast((p) => p.date <= weekBefore);
  return {
    latest,
    isToday: latest.date === today,
    daysAgo: daysBetween(latest.date, today),
    ...(reference && { weekChange: latest.kg - reference.kg }),
  };
}

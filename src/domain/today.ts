import { addDays, daysBetween, type LocalDate } from './date';

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
  /**
   * Change since the most recent weigh-in 7 to 30 days before the latest one, and over how many
   * days. Undefined without one: an older reference would read as a weekly change.
   */
  change?: { kg: number; days: number };
}

export function todayWeight<P extends WeightLike>(points: readonly P[], today: LocalDate): TodayWeight<P> {
  const past = points.filter((p) => p.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const latest = past.at(-1);
  if (!latest) return {};
  const newest = addDays(latest.date, -7);
  const oldest = addDays(latest.date, -30);
  const reference = past.findLast((p) => p.date <= newest && p.date >= oldest);
  return {
    latest,
    isToday: latest.date === today,
    daysAgo: daysBetween(latest.date, today),
    ...(reference && {
      change: { kg: latest.kg - reference.kg, days: daysBetween(reference.date, latest.date) },
    }),
  };
}

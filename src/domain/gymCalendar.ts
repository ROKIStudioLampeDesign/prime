import { addDays, fromLocalDate, toLocalDate, type LocalDate } from './date';

/** Monday of the week containing `date`. */
export function weekStart(date: LocalDate): LocalDate {
  const day = fromLocalDate(date).getDay(); // 0 = Sunday
  return addDays(date, -((day + 6) % 7));
}

/**
 * Calendar grid for a month (month is 1-12): weeks starting on Monday, with `null` for the
 * leading and trailing cells outside the month.
 */
export function monthGrid(year: number, month: number): (LocalDate | null)[][] {
  const first = toLocalDate(new Date(year, month - 1, 1));
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = (fromLocalDate(first).getDay() + 6) % 7;
  const cells: (LocalDate | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (LocalDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Days that count as gym days: any day with a workout, plus days marked attended manually.
 * A manual "not attended" never hides a day that has a workout.
 */
export function attendedDates(
  workoutDates: readonly LocalDate[],
  manualDays: readonly { date: LocalDate; attended: boolean }[],
): Set<LocalDate> {
  const out = new Set(workoutDates);
  for (const d of manualDays) if (d.attended) out.add(d.date);
  return out;
}

/** Number of gym days in a month (month is 1-12). */
export function sessionsInMonth(attended: ReadonlySet<LocalDate>, year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  let count = 0;
  for (const d of attended) if (d.startsWith(prefix)) count++;
  return count;
}

/**
 * Consecutive weeks (Monday-based) with at least one gym day, ending this week. The current
 * week doesn't break the streak while it's in progress: without a session yet, counting starts
 * from last week.
 */
export function weeklyStreak(attended: ReadonlySet<LocalDate>, today: LocalDate): number {
  const weeks = new Set([...attended].filter((d) => d <= today).map(weekStart));
  let cursor = weekStart(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

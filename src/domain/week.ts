import { addDays, fromLocalDate, type LocalDate } from './date';

/** Monday of the week containing `date` (weeks start on Monday). */
export function weekStart(date: LocalDate): LocalDate {
  const day = fromLocalDate(date).getDay(); // 0 = Sunday
  return addDays(date, -((day + 6) % 7));
}

/** Sunday of the week containing `date`. */
export function weekEnd(date: LocalDate): LocalDate {
  return addDays(weekStart(date), 6);
}

/** The 7 days (Monday → Sunday) of the week containing `date`. */
export function weekDays(date: LocalDate): LocalDate[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isInWeek(date: LocalDate, weekOf: LocalDate): boolean {
  return date >= weekStart(weekOf) && date <= weekEnd(weekOf);
}

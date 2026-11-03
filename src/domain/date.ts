import { addDays as addCalendarDays, differenceInCalendarDays, format, isValid, parse } from 'date-fns';

/** A calendar day in the user's local time zone, formatted "YYYY-MM-DD". */
export type LocalDate = string & { readonly __brand: 'LocalDate' };

const LOCAL_DATE_FORMAT = 'yyyy-MM-dd';
const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toLocalDate(date: Date): LocalDate {
  return format(date, LOCAL_DATE_FORMAT) as LocalDate;
}

export function todayLocalDate(now: Date = new Date()): LocalDate {
  return toLocalDate(now);
}

/** Calendar days from `from` to `to` (negative when `to` is earlier); DST-safe. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return differenceInCalendarDays(fromLocalDate(to), fromLocalDate(from));
}

/** Milliseconds from `now` to the next local midnight (23 h or 25 h away on DST days). */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function isLocalDate(value: string): value is LocalDate {
  return LOCAL_DATE_RE.test(value) && isValid(parse(value, LOCAL_DATE_FORMAT, new Date()));
}

/** Parses a LocalDate to a Date at local midnight. Never use `new Date("YYYY-MM-DD")`: it parses as UTC. */
export function fromLocalDate(value: LocalDate): Date {
  return parse(value, LOCAL_DATE_FORMAT, new Date());
}

/** Shifts a day by `days` calendar days; DST-safe because it works on local calendar fields. */
export function addDays(value: LocalDate, days: number): LocalDate {
  return toLocalDate(addCalendarDays(fromLocalDate(value), days));
}

/** A calendar month; `month` is 1–12. */
export interface YearMonth {
  year: number;
  month: number;
}

const MONTH_PARAM_RE = /^(\d{4})-(\d{2})$/;

/** Parses a "YYYY-MM" URL param; anything invalid falls back to the month of `today`. */
export function parseMonthParam(raw: string | null, today: LocalDate): YearMonth {
  const match = raw ? MONTH_PARAM_RE.exec(raw) : null;
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (match && month >= 1 && month <= 12) return { year, month };
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

export function formatMonthParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Moves by `delta` months, carrying over years in both directions. */
export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

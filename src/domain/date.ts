import { format, isValid, parse } from 'date-fns';

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

export function isLocalDate(value: string): value is LocalDate {
  return LOCAL_DATE_RE.test(value) && isValid(parse(value, LOCAL_DATE_FORMAT, new Date()));
}

/** Parses a LocalDate to a Date at local midnight. Never use `new Date("YYYY-MM-DD")`: it parses as UTC. */
export function fromLocalDate(value: LocalDate): Date {
  return parse(value, LOCAL_DATE_FORMAT, new Date());
}

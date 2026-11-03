import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatMonthParam,
  fromLocalDate,
  isLocalDate,
  msUntilNextLocalMidnight,
  parseMonthParam,
  shiftMonth,
  toLocalDate,
  type LocalDate,
} from './date';

describe('local dates', () => {
  it('formats using local calendar fields, not UTC', () => {
    expect(toLocalDate(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
    expect(toLocalDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('round-trips to local midnight', () => {
    const d = fromLocalDate('2026-03-29' as LocalDate);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 29, 0]);
    expect(toLocalDate(d)).toBe('2026-03-29');
  });

  it('validates the format and the calendar', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-2-3')).toBe(false);
    expect(isLocalDate('2026-02-28T10:00')).toBe(false);
  });

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31' as LocalDate, 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01' as LocalDate, -1)).toBe('2025-12-31');
    expect(addDays('2026-03-28' as LocalDate, 2)).toBe('2026-03-30'); // EU DST starts 2026-03-29
    expect(addDays('2026-10-24' as LocalDate, 2)).toBe('2026-10-26'); // EU DST ends 2026-10-25
    expect(addDays('2028-02-28' as LocalDate, 1)).toBe('2028-02-29');
    expect(addDays('2026-05-10' as LocalDate, 0)).toBe('2026-05-10');
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('counts down to the next local midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 10, 2, 23, 59, 50))).toBe(10_000);
    expect(msUntilNextLocalMidnight(new Date(2026, 10, 2, 0, 0, 0))).toBe(24 * 3_600_000);
  });

  it('follows the clock on DST days (23 h and 25 h days in Europe/Paris)', () => {
    // These assertions hold in any time zone: they only use local calendar fields.
    const springStart = new Date(2026, 2, 29, 0, 0, 0);
    expect(msUntilNextLocalMidnight(springStart)).toBe(
      new Date(2026, 2, 30).getTime() - springStart.getTime(),
    );
    const autumnStart = new Date(2026, 9, 25, 0, 0, 0);
    expect(msUntilNextLocalMidnight(autumnStart)).toBe(
      new Date(2026, 9, 26).getTime() - autumnStart.getTime(),
    );
  });
});

describe('month params', () => {
  const today = '2026-11-03' as LocalDate;

  it('parses "YYYY-MM" and falls back to the current month', () => {
    expect(parseMonthParam('2025-02', today)).toEqual({ year: 2025, month: 2 });
    expect(parseMonthParam(null, today)).toEqual({ year: 2026, month: 11 });
    expect(parseMonthParam('', today)).toEqual({ year: 2026, month: 11 });
    expect(parseMonthParam('2025-2', today)).toEqual({ year: 2026, month: 11 });
    expect(parseMonthParam('nope', today)).toEqual({ year: 2026, month: 11 });
  });

  it('rejects months outside 1–12 as a whole, keeping year and month consistent', () => {
    expect(parseMonthParam('2025-13', today)).toEqual({ year: 2026, month: 11 });
    expect(parseMonthParam('2025-00', today)).toEqual({ year: 2026, month: 11 });
  });

  it('formats and shifts across year boundaries', () => {
    expect(formatMonthParam({ year: 2026, month: 3 })).toBe('2026-03');
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 5 }, -17)).toEqual({ year: 2024, month: 12 });
  });
});

describe('daysBetween', () => {
  const ld = (s: string) => s as LocalDate;

  it('counts calendar days, across months, years and DST changes', () => {
    expect(daysBetween(ld('2026-11-03'), ld('2026-11-03'))).toBe(0);
    expect(daysBetween(ld('2026-10-31'), ld('2026-11-01'))).toBe(1);
    expect(daysBetween(ld('2025-12-31'), ld('2026-01-02'))).toBe(2);
    // 2026-03-29 and 2026-10-25 are DST changes in Europe/Paris (23 h and 25 h days).
    expect(daysBetween(ld('2026-03-28'), ld('2026-03-30'))).toBe(2);
    expect(daysBetween(ld('2026-10-24'), ld('2026-10-26'))).toBe(2);
    expect(daysBetween(ld('2026-11-05'), ld('2026-11-03'))).toBe(-2);
  });
});

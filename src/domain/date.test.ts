import { describe, expect, it } from 'vitest';
import {
  addDays,
  fromLocalDate,
  isLocalDate,
  msUntilNextLocalMidnight,
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

import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import { isInWeek, weekDays, weekEnd, weekStart } from './week';

const d = (s: string) => s as LocalDate;

describe('week boundaries (Monday → Sunday)', () => {
  it('maps every day of a week to the same Monday and Sunday', () => {
    for (const day of ['2026-11-02', '2026-11-05', '2026-11-08']) {
      expect(weekStart(d(day))).toBe('2026-11-02');
      expect(weekEnd(d(day))).toBe('2026-11-08');
    }
  });

  it('crosses year boundaries', () => {
    expect(weekStart(d('2027-01-01'))).toBe('2026-12-28'); // Friday
    expect(weekEnd(d('2026-12-28'))).toBe('2027-01-03');
    expect(weekDays(d('2026-12-31'))).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });

  it('is not shifted by DST changes (EU: 29 Mar and 25 Oct 2026)', () => {
    expect(weekDays(d('2026-03-29'))).toEqual([
      '2026-03-23',
      '2026-03-24',
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
    ]);
    expect(weekStart(d('2026-03-30'))).toBe('2026-03-30');
    expect(weekStart(d('2026-10-25'))).toBe('2026-10-19');
    expect(weekEnd(d('2026-10-25'))).toBe('2026-10-25');
    expect(weekStart(d('2026-10-26'))).toBe('2026-10-26');
  });

  it('handles leap days', () => {
    expect(weekDays(d('2028-02-29'))).toContain('2028-02-29');
    expect(weekStart(d('2028-03-01'))).toBe('2028-02-28');
  });

  it('isInWeek includes both ends', () => {
    expect(isInWeek(d('2026-11-02'), d('2026-11-05'))).toBe(true);
    expect(isInWeek(d('2026-11-08'), d('2026-11-05'))).toBe(true);
    expect(isInWeek(d('2026-11-09'), d('2026-11-05'))).toBe(false);
    expect(isInWeek(d('2026-11-01'), d('2026-11-05'))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { fromLocalDate, isLocalDate, toLocalDate, type LocalDate } from './date';

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
});

import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import {
  attendedDates,
  monthGrid,
  redDates,
  restDates,
  sessionsInMonth,
  weekStart,
  weeklyStreak,
} from './gymCalendar';

const d = (s: string) => s as LocalDate;

describe('weekStart', () => {
  it('returns the Monday of the week', () => {
    expect(weekStart(d('2026-11-02'))).toBe('2026-11-02'); // Monday
    expect(weekStart(d('2026-11-08'))).toBe('2026-11-02'); // Sunday
    expect(weekStart(d('2026-11-01'))).toBe('2026-10-26'); // Sunday, previous month
    expect(weekStart(d('2026-01-01'))).toBe('2025-12-29'); // across years
  });
});

describe('monthGrid', () => {
  it('starts weeks on Monday with leading/trailing blanks', () => {
    const grid = monthGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid[1]?.[0]).toBe('2026-11-02');
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.at(-1)).toEqual(['2026-11-30', null, null, null, null, null, null]);
  });

  it('handles a month starting on Monday and leap years', () => {
    expect(monthGrid(2027, 2)[0]?.[0]).toBe('2027-02-01'); // Monday
    expect(monthGrid(2028, 2).flat().filter(Boolean)).toHaveLength(29);
    expect(monthGrid(2027, 2)).toHaveLength(4); // 28 days starting on a Monday: exactly 4 rows
    expect(monthGrid(2026, 2)).toHaveLength(5); // starts on a Sunday: 6 leading blanks
  });
});

describe('attendance', () => {
  it('merges workout days and manual days; manual "no" never hides a workout', () => {
    const set = attendedDates(
      [d('2026-11-02'), d('2026-11-04')],
      [
        { date: d('2026-11-03'), attended: true },
        { date: d('2026-11-04'), attended: false },
        { date: d('2026-11-05'), attended: false },
      ],
    );
    expect([...set].sort()).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
  });

  it('counts sessions in a month', () => {
    const set = new Set([d('2026-11-02'), d('2026-11-30'), d('2026-10-31'), d('2025-11-02')]);
    expect(sessionsInMonth(set, 2026, 11)).toBe(2);
    expect(sessionsInMonth(new Set(), 2026, 11)).toBe(0);
  });
});

describe('weeklyStreak', () => {
  const today = d('2026-11-04'); // Wednesday

  it('counts consecutive weeks including the current one', () => {
    const set = new Set([d('2026-11-02'), d('2026-10-28'), d('2026-10-20'), d('2026-10-01')]);
    expect(weeklyStreak(set, today)).toBe(3);
  });

  it('does not break while the current week has no session yet', () => {
    const set = new Set([d('2026-10-28'), d('2026-10-20')]);
    expect(weeklyStreak(set, today)).toBe(2);
  });

  it('is 0 when last week and this week are empty', () => {
    expect(weeklyStreak(new Set([d('2026-10-20')]), today)).toBe(0);
    expect(weeklyStreak(new Set(), today)).toBe(0);
  });

  it('ignores future days', () => {
    expect(weeklyStreak(new Set([d('2026-11-20')]), today)).toBe(0);
  });

  it('counts several sessions in one week once', () => {
    expect(weeklyStreak(new Set([d('2026-11-02'), d('2026-11-03'), d('2026-11-04')]), today)).toBe(1);
  });
});

describe('restDates', () => {
  it('is empty without marks', () => {
    expect(restDates([], []).size).toBe(0);
    expect(restDates([d('2026-11-02')], [{ date: d('2026-11-03') }]).size).toBe(0);
  });

  it('keeps rest days and drops those with a workout', () => {
    const set = restDates(
      [d('2026-11-04')],
      [
        { date: d('2026-11-03'), rest: true },
        { date: d('2026-11-04'), rest: true }, // a session was logged anyway
        { date: d('2026-11-05'), rest: false },
        { date: d('2026-11-06') },
      ],
    );
    expect([...set]).toEqual(['2026-11-03']);
  });

  it('never overlaps attended days', () => {
    const manual = [
      { date: d('2026-11-03'), attended: false, rest: true },
      { date: d('2026-11-04'), attended: true },
    ];
    const workouts = [d('2026-11-05')];
    const rest = restDates(workouts, manual);
    const attended = attendedDates(workouts, manual);
    expect([...rest].filter((x) => attended.has(x))).toEqual([]);
  });
});

describe('redDates', () => {
  it('keeps the days not counted that have no workout', () => {
    expect(redDates([], new Map()).size).toBe(0);
    const unlogged = new Map([
      [d('2026-11-03'), 'under'],
      [d('2026-11-04'), 'over'],
      [d('2026-11-05'), 'over'],
    ]);
    expect([...redDates([d('2026-11-05')], unlogged)]).toEqual(['2026-11-03', '2026-11-04']);
  });
});

import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import { calorieStreak, defaultPrTarget, prBenchPlan, weekStreak, type DayKcal } from './streaks';

const d = (s: string) => s as LocalDate;
const days = (rows: Record<string, number>) =>
  new Map<LocalDate, DayKcal>(Object.entries(rows).map(([day, kcal]) => [d(day), { kcal, entries: 1 }]));

describe('calorieStreak', () => {
  const today = d('2026-11-05');

  it('counts consecutive logged days at or under the goal, today included', () => {
    const byDay = days({ '2026-11-03': 1400, '2026-11-04': 1500, '2026-11-05': 900 });
    expect(calorieStreak(byDay, 1500, today)).toEqual({ days: 3, today: 'ok' });
  });

  it('breaks on a day over the goal, today too', () => {
    expect(calorieStreak(days({ '2026-11-03': 1400, '2026-11-04': 1501 }), 1500, today).days).toBe(0);
    expect(calorieStreak(days({ '2026-11-04': 1200, '2026-11-05': 1600 }), 1500, today)).toEqual({
      days: 0,
      today: 'over',
    });
  });

  it('does not let an empty today break the streak, but an empty past day does', () => {
    expect(calorieStreak(days({ '2026-11-03': 1400, '2026-11-04': 1400 }), 1500, today)).toEqual({
      days: 2,
      today: 'empty',
    });
    expect(calorieStreak(days({ '2026-11-02': 1400, '2026-11-04': 1400 }), 1500, today).days).toBe(1);
  });

  it('does not count a day with no entries even at 0 kcal', () => {
    const byDay = new Map<LocalDate, DayKcal>([[d('2026-11-04'), { kcal: 0, entries: 0 }]]);
    expect(calorieStreak(byDay, 1500, today)).toEqual({ days: 0, today: 'empty' });
  });

  it('breaks on a day not counted but over, whatever was logged that day', () => {
    const byDay = days({ '2026-11-02': 1400, '2026-11-03': 1400, '2026-11-04': 1400 });
    const over = (date: string) => new Map([[d(date), 'over' as const]]);
    expect(calorieStreak(byDay, 1500, today, over('2026-11-03'))).toEqual({ days: 1, today: 'empty' });
    expect(calorieStreak(byDay, 1500, today, over('2026-11-05'))).toEqual({ days: 0, today: 'over' });
  });

  it('skips a day not counted but under: it neither counts nor breaks', () => {
    const byDay = days({ '2026-11-02': 1400, '2026-11-03': 1900, '2026-11-04': 1400 });
    const under = new Map([[d('2026-11-03'), 'under' as const]]);
    expect(calorieStreak(byDay, 1500, today, under)).toEqual({ days: 2, today: 'empty' });
    // Today skipped: the streak up to yesterday is kept.
    const todayUnder = new Map([[today, 'under' as const]]);
    expect(calorieStreak(days({ '2026-11-04': 1400 }), 1500, today, todayUnder)).toEqual({
      days: 1,
      today: 'skipped',
    });
    // Skipped days alone make no streak.
    expect(calorieStreak(new Map(), 1500, today, todayUnder).days).toBe(0);
  });

  it('crosses month and year boundaries', () => {
    const byDay = days({ '2025-12-31': 1000, '2026-01-01': 1000 });
    expect(calorieStreak(byDay, 1500, d('2026-01-01')).days).toBe(2);
  });
});

describe('weekStreak', () => {
  // 2026-11-02 is a Monday.
  const week = (monday: string, n: number) =>
    Array.from({ length: n }, (_, i) =>
      d(`2026-${monday.slice(5, 8)}${String(Number(monday.slice(8)) + i).padStart(2, '0')}`),
    );

  it('counts Monday–Sunday weeks with at least the target number of gym days', () => {
    const attended = new Set([...week('2026-10-19', 5), ...week('2026-10-26', 6)]);
    expect(weekStreak(attended, d('2026-11-03'), 5)).toEqual({ weeks: 2, thisWeek: 0, target: 5 });
  });

  it('lets the current week count once it reaches the target, never breaking while in progress', () => {
    const attended = new Set([...week('2026-10-26', 5), ...week('2026-11-02', 5)]);
    expect(weekStreak(attended, d('2026-11-06'), 5)).toEqual({ weeks: 2, thisWeek: 5, target: 5 });
    expect(weekStreak(new Set(week('2026-11-02', 2)), d('2026-11-04'), 5)).toEqual({
      weeks: 0,
      thisWeek: 2,
      target: 5,
    });
  });

  it('stops at a week under the target and ignores future days', () => {
    const attended = new Set([...week('2026-10-19', 5), ...week('2026-10-26', 4), d('2026-11-20')]);
    expect(weekStreak(attended, d('2026-11-03'), 5).weeks).toBe(0);
  });
});

describe('PR bench plan', () => {
  it('ramps from the empty bar to a single at the target, loads rounded to 2.5 kg', () => {
    expect(prBenchPlan(82.5)).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 42.5, reps: 5 },
      { weightKg: 57.5, reps: 3 },
      { weightKg: 70, reps: 1 },
      { weightKg: 75, reps: 1 },
      { weightKg: 82.5, reps: 1 },
    ]);
  });

  it('skips ramp steps at or under the bar for light targets', () => {
    expect(prBenchPlan(30)).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 25, reps: 1 },
      { weightKg: 27.5, reps: 1 },
      { weightKg: 30, reps: 1 },
    ]);
  });

  it('defaults the target to the best lift + 2.5 kg', () => {
    expect(defaultPrTarget(80)).toBe(82.5);
    expect(defaultPrTarget(0)).toBe(20);
  });
});

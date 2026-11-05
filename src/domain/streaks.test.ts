import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import {
  benchBadgeDates,
  benchRank,
  benchRankLabel,
  benchBadges,
  benchBadgesCrossed,
  calorieStreak,
  defaultPrTarget,
  prBenchPlan,
  weekStreak,
  type DayKcal,
} from './streaks';

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

describe('bench badges', () => {
  it('lists milestones every 10 kg from 60 to the 120 kg goal, unlocked by the best lift', () => {
    const badges = benchBadges(80);
    expect(badges.map((b) => b.kg)).toEqual([60, 70, 80, 90, 100, 110, 120]);
    expect(badges.filter((b) => b.unlocked).map((b) => b.kg)).toEqual([60, 70, 80]);
    expect(benchBadges(0).every((b) => !b.unlocked)).toBe(true);
  });

  it('keeps going two steps past the best lift beyond the goal', () => {
    expect(
      benchBadges(125)
        .map((b) => b.kg)
        .at(-1),
    ).toBe(140);
  });

  it('reports the milestones a session crossed', () => {
    expect(benchBadgesCrossed(78, 92.5)).toEqual([80, 90]);
    expect(benchBadgesCrossed(80, 82.5)).toEqual([]);
    expect(benchBadgesCrossed(0, 60)).toEqual([60]);
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

describe('benchBadgeDates', () => {
  it('dates each milestone by the first set that reached it, ignoring 0-rep sets', () => {
    const history = [
      { weightKg: 75, reps: 3, date: d('2026-09-01'), startedAt: 1 },
      { weightKg: 90, reps: 0, date: d('2026-09-15'), startedAt: 2 },
      { weightKg: 82.5, reps: 1, date: d('2026-10-20'), startedAt: 3 },
    ];
    const dates = benchBadgeDates(history, [60, 70, 80, 90]);
    expect(Object.fromEntries(dates)).toEqual({ 60: '2026-09-01', 70: '2026-09-01', 80: '2026-10-20' });
  });
});

describe('benchRank', () => {
  it('names each 10 kg milestone: two divisions per metal, Rubis at the goal, then Obsidienne', () => {
    const labels = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 200].map(benchRankLabel);
    expect(labels).toEqual([
      'Bronze I',
      'Bronze II',
      'Argent I',
      'Argent II',
      'Or I',
      'Or II',
      'Rubis',
      'Obsidienne I',
      'Obsidienne II',
      'Obsidienne III',
      'Obsidienne III',
    ]);
  });

  it('gives each tier its level of ornaments', () => {
    expect([60, 80, 100, 120, 130].map((kg) => benchRank(kg).tier)).toEqual([0, 1, 2, 3, 4]);
    expect(benchRank(120).division).toBe(0);
  });
});

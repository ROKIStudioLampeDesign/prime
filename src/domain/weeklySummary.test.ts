import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import { ZERO_MACROS } from './nutrition';
import { delta, kcalGoalMet, proteinGoalMet, weeklySummary } from './weeklySummary';

const d = (s: string) => s as LocalDate;
const food = (date: string, kcal: number, protein: number) => ({
  date: d(date),
  macros: { ...ZERO_MACROS, kcal, protein },
});

// Week of Mon 2 → Sun 8 Nov 2026.
const base = {
  weekOf: d('2026-11-05'),
  workouts: [
    { date: d('2026-11-02'), volumeKg: 5000 },
    { date: d('2026-11-04'), volumeKg: 6000.5 },
    { date: d('2026-11-09'), volumeKg: 9999 }, // next week
    { date: d('2026-11-01'), volumeKg: 9999 }, // previous week
  ],
  foodEntries: [
    food('2026-11-02', 1200, 80),
    food('2026-11-02', 1000, 80), // same day: 2200 kcal, 160 g
    food('2026-11-03', 2600, 120),
    food('2026-11-08', 1800, 170),
    food('2026-11-09', 5000, 500), // next week
  ],
  goals: { kcal: 2300, protein: 150 },
  weights: [
    { date: d('2026-10-30'), kg: 80 },
    { date: d('2026-11-03'), kg: 79.6 },
    { date: d('2026-11-07'), kg: 79.2 },
    { date: d('2026-11-10'), kg: 78 },
  ],
};

describe('weeklySummary', () => {
  const s = weeklySummary(base);

  it('bounds the week Monday → Sunday', () => {
    expect([s.start, s.end]).toEqual(['2026-11-02', '2026-11-08']);
    expect(s.days.map((x) => x.date)).toHaveLength(7);
  });

  it('counts workouts and volume inside the week only', () => {
    expect(s.workoutCount).toBe(2);
    expect(s.volumeKg).toBeCloseTo(11000.5);
  });

  it('averages nutrition over logged days only', () => {
    expect(s.loggedDays).toBe(3);
    expect(s.avgKcal).toBeCloseTo((2200 + 2600 + 1800) / 3);
    expect(s.avgProtein).toBeCloseTo((160 + 120 + 170) / 3);
    expect(s.days.find((x) => x.date === '2026-11-04')).toEqual({
      date: '2026-11-04',
      logged: false,
      kcal: 0,
      protein: 0,
    });
  });

  it('leaves days not counted out of the nutrition stats and counts them', () => {
    const unlogged = new Map([
      [d('2026-11-03'), 'over' as const],
      [d('2026-11-04'), 'under' as const],
      [d('2026-10-30'), 'under' as const], // previous week
    ]);
    const week = weeklySummary({ ...base, unlogged });
    expect(week.unloggedDays).toBe(2);
    expect(week.loggedDays).toBe(2);
    expect(week.avgKcal).toBeCloseTo((2200 + 1800) / 2);
    expect(week.days.find((x) => x.date === '2026-11-03')).toMatchObject({ logged: false, unlogged: 'over' });
    expect(s.unloggedDays).toBe(0);
  });

  it('leaves the day in progress (and later days) out of the nutrition stats', () => {
    const live = weeklySummary({ ...base, today: d('2026-11-03') });
    expect(live.loggedDays).toBe(1);
    expect(live.avgKcal).toBeCloseTo(2200);
    expect(live.kcalGoalDays).toBe(1);
    expect(live.days.find((x) => x.date === '2026-11-03')?.logged).toBe(false);
    expect(live.workoutCount).toBe(2); // sessions still count
    // First day of the week: nothing counted yet.
    expect(weeklySummary({ ...base, today: d('2026-11-02') }).avgKcal).toBeUndefined();
    // A past week is unaffected.
    expect(weeklySummary({ ...base, today: d('2026-11-12') }).loggedDays).toBe(3);
  });

  it('counts goal days among logged days (kcal ±10 %, protein ≥ goal)', () => {
    expect(s.kcalGoalDays).toBe(1); // 2200 ok; 2600 > 2530; 1800 < 2070
    expect(s.proteinGoalDays).toBe(2); // 160 and 170
  });

  it('computes weight change from the last weigh-in before the week', () => {
    expect(s.weightChange).toBe(-0.8); // 79.2 − 80
  });

  it('falls back to the first weigh-in of the week, or nothing', () => {
    expect(weeklySummary({ ...base, weights: base.weights.slice(1, 3) }).weightChange).toBe(-0.4);
    expect(
      weeklySummary({ ...base, weights: [base.weights[0] ?? { date: d('2026-10-30'), kg: 80 }] })
        .weightChange,
    ).toBeUndefined();
  });

  it('handles an empty week and missing goals', () => {
    const empty = weeklySummary({
      weekOf: d('2026-01-01'),
      workouts: [],
      foodEntries: [],
      goals: {},
      weights: [],
    });
    expect(empty).toMatchObject({
      start: '2025-12-29',
      end: '2026-01-04',
      workoutCount: 0,
      volumeKg: 0,
      loggedDays: 0,
      avgKcal: undefined,
      kcalGoalDays: undefined,
      proteinGoalDays: undefined,
      weightChange: undefined,
    });
  });
});

describe('goal helpers and delta', () => {
  it('kcal just under the goal, protein at or very close to it', () => {
    expect(kcalGoalMet(2070, 2300)).toBe(true);
    expect(kcalGoalMet(2300, 2300)).toBe(true);
    expect(kcalGoalMet(2301, 2300)).toBe(false);
    expect(kcalGoalMet(2069, 2300)).toBe(false);
    expect(kcalGoalMet(100, 0)).toBe(false);
    expect(proteinGoalMet(150, 150)).toBe(true);
    expect(proteinGoalMet(190, 150)).toBe(true);
    expect(proteinGoalMet(142.5, 150)).toBe(true);
    expect(proteinGoalMet(142.4, 150)).toBe(false);
    expect(proteinGoalMet(10, 0)).toBe(false);
  });

  it('gives the direction of change', () => {
    expect(delta(3, 2)).toEqual({ value: 1, direction: 'up' });
    expect(delta(1, 3)).toEqual({ value: -2, direction: 'down' });
    expect(delta(2, 2)).toEqual({ value: 0, direction: 'same' });
  });
});

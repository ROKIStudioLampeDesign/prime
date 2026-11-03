import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import { daysBetween, todayWeight, todayWorkouts } from './today';

const d = (s: string) => s as LocalDate;
const today = d('2026-11-03');

describe('daysBetween', () => {
  it('counts calendar days, across months, years and DST changes', () => {
    expect(daysBetween(d('2026-11-03'), d('2026-11-03'))).toBe(0);
    expect(daysBetween(d('2026-10-31'), d('2026-11-01'))).toBe(1);
    expect(daysBetween(d('2025-12-31'), d('2026-01-02'))).toBe(2);
    // 2026-03-29 and 2026-10-25 are DST changes in Europe/Paris (23 h and 25 h days).
    expect(daysBetween(d('2026-03-28'), d('2026-03-30'))).toBe(2);
    expect(daysBetween(d('2026-10-24'), d('2026-10-26'))).toBe(2);
    expect(daysBetween(d('2026-11-05'), d('2026-11-03'))).toBe(-2);
  });
});

describe('todayWorkouts', () => {
  const w = (id: number, date: string, status: 'active' | 'done' = 'done', startedAt = id) => ({
    id,
    date: d(date),
    status,
    startedAt,
  });

  it('puts an active workout first, whatever its date', () => {
    const active = w(3, '2026-11-02', 'active');
    expect(todayWorkouts([w(1, '2026-11-03'), active], today)).toEqual({ kind: 'active', workout: active });
  });

  it('lists the workouts done today, in start order', () => {
    const r = todayWorkouts([w(2, '2026-11-03', 'done', 20), w(1, '2026-11-03', 'done', 10)], today);
    expect(r).toEqual({
      kind: 'done',
      workouts: [w(1, '2026-11-03', 'done', 10), w(2, '2026-11-03', 'done', 20)],
    });
  });

  it('otherwise reports the most recent past workout and how long ago it was', () => {
    const r = todayWorkouts([w(1, '2026-10-20'), w(2, '2026-11-01'), w(3, '2026-10-30')], today);
    expect(r).toEqual({ kind: 'none', last: { workout: w(2, '2026-11-01'), daysAgo: 2 } });
  });

  it('handles no workouts at all, and ignores future-dated ones', () => {
    expect(todayWorkouts([], today)).toEqual({ kind: 'none' });
    expect(todayWorkouts([w(1, '2026-11-10')], today)).toEqual({ kind: 'none' });
  });
});

describe('todayWeight', () => {
  const p = (date: string, kg: number) => ({ date: d(date), kg });

  it('is empty without weigh-ins', () => {
    expect(todayWeight([], today)).toEqual({});
  });

  it('gives the latest weigh-in, whether it is from today, and its age', () => {
    expect(todayWeight([p('2026-11-01', 80), p('2026-11-03', 79.4)], today)).toMatchObject({
      latest: p('2026-11-03', 79.4),
      isToday: true,
      daysAgo: 0,
    });
    expect(todayWeight([p('2026-10-30', 80), p('2026-11-01', 79.8)], today)).toMatchObject({
      latest: p('2026-11-01', 79.8),
      isToday: false,
      daysAgo: 2,
    });
  });

  it('compares with the closest weigh-in about a week earlier', () => {
    // Reference: latest weigh-in on or before latest − 7 days.
    const r = todayWeight(
      [p('2026-10-25', 81), p('2026-10-27', 80.6), p('2026-11-02', 80), p('2026-11-03', 79.9)],
      today,
    );
    expect(r.weekChange).toBeCloseTo(-0.7);
  });

  it('has no weekly change without a weigh-in at least 7 days older', () => {
    expect(todayWeight([p('2026-10-30', 80), p('2026-11-03', 79.9)], today).weekChange).toBeUndefined();
  });

  it('ignores weigh-ins dated after today', () => {
    expect(todayWeight([p('2026-11-03', 79), p('2026-11-04', 78)], today).latest).toEqual(
      p('2026-11-03', 79),
    );
  });
});

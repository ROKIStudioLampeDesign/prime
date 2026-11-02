import { describe, expect, it } from 'vitest';
import {
  movingAverage,
  pointsInRange,
  rangeStart,
  summarizeWeights,
  validateBodyWeight,
  type WeightPoint,
} from './bodyWeight';
import type { LocalDate } from './date';

const p = (date: string, kg: number): WeightPoint => ({ date: date as LocalDate, kg });
const today = '2026-11-10' as LocalDate;

describe('validateBodyWeight', () => {
  it('rounds to 0.1 kg and rejects implausible values', () => {
    expect(validateBodyWeight(72.46)).toBe(72.5);
    expect(validateBodyWeight(72.44)).toBe(72.4);
    expect(validateBodyWeight(20)).toBe(20);
    expect(validateBodyWeight(19.9)).toBeUndefined();
    expect(validateBodyWeight(401)).toBeUndefined();
    expect(validateBodyWeight(NaN)).toBeUndefined();
  });
});

describe('movingAverage', () => {
  it('averages the trailing 7 calendar days', () => {
    const points = [1, 2, 3, 4, 5, 6, 7, 8].map((day) =>
      p(`2026-11-0${day}`.replace('-010', '-10'), 70 + day),
    );
    const avg = movingAverage(points);
    expect(avg[0]?.kg).toBe(71);
    expect(avg[6]?.kg).toBe(74); // days 1..7 → 71..77
    expect(avg[7]?.kg).toBe(75); // days 2..8 → day 1 dropped
  });

  it('handles gaps: only weigh-ins inside the window count, missing days are not zeros', () => {
    const avg = movingAverage([p('2026-11-01', 80), p('2026-11-03', 82), p('2026-11-20', 70)]);
    expect(avg.map((a) => a.kg)).toEqual([80, 81, 70]); // the 20th is alone in its window
  });

  it('sorts unsorted input and handles empty and single inputs', () => {
    expect(movingAverage([p('2026-11-03', 82), p('2026-11-01', 80)]).map((a) => a.date)).toEqual([
      '2026-11-01',
      '2026-11-03',
    ]);
    expect(movingAverage([])).toEqual([]);
    expect(movingAverage([p('2026-11-01', 80)])).toEqual([p('2026-11-01', 80)]);
  });

  it('crosses month and year boundaries by calendar days', () => {
    const avg = movingAverage([p('2026-12-26', 80), p('2027-01-01', 82), p('2027-01-02', 84)]);
    expect(avg[1]?.kg).toBe(81); // 26 Dec is within 7 days of 1 Jan
    expect(avg[2]?.kg).toBe(83); // 26 Dec is out of the window ending 2 Jan
  });
});

describe('ranges and summary', () => {
  const points = [p('2026-05-01', 85), p('2026-09-01', 80), p('2026-10-20', 78.4), p('2026-11-09', 79.1)];

  it('computes range starts', () => {
    expect(rangeStart('1M', today)).toBe('2026-10-12');
    expect(rangeStart('3M', today)).toBe('2026-08-12');
    expect(rangeStart('all', today)).toBeUndefined();
  });

  it('filters points by range, excluding the future', () => {
    expect(pointsInRange(points, '1M', today).map((x) => x.kg)).toEqual([78.4, 79.1]);
    expect(pointsInRange(points, 'all', today)).toHaveLength(4);
    expect(pointsInRange([p('2026-12-01', 70)], 'all', today)).toEqual([]);
  });

  it('summarizes current value, change, min and max', () => {
    expect(summarizeWeights(points)).toEqual({
      current: p('2026-11-09', 79.1),
      change: -5.9,
      min: p('2026-10-20', 78.4),
      max: p('2026-05-01', 85),
    });
    expect(summarizeWeights([p('2026-11-09', 79.1)])?.change).toBe(0);
    expect(summarizeWeights([])).toBeUndefined();
  });
});

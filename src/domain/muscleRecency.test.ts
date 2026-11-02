import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import {
  colorFor,
  daysSince,
  hueFor,
  lastTrainedDate,
  muscleRecency,
  NEUTRAL_COLOR,
  recentExercises,
  setsInLastDays,
  validateThresholds,
  type TrainingRecord,
} from './muscleRecency';

const d = (s: string) => s as LocalDate;
const today = d('2026-11-10');
const BENCH = 1;
const ROW = 2;
const PUSHDOWN = 3;

const rec = (
  date: string,
  exerciseId: number,
  primary: TrainingRecord['primary'],
  secondary: TrainingRecord['secondary'] = [],
) => ({
  date: d(date),
  exerciseId,
  primary,
  secondary,
});

const records: TrainingRecord[] = [
  rec('2026-11-01', BENCH, ['chest'], ['triceps', 'shoulders_front']),
  rec('2026-11-01', BENCH, ['chest'], ['triceps', 'shoulders_front']),
  rec('2026-11-08', ROW, ['upper_back', 'lats'], ['biceps']),
  rec('2026-11-05', PUSHDOWN, ['triceps']),
  rec('2026-11-09', BENCH, ['chest'], ['triceps', 'shoulders_front']),
];

const withSecondary = { countSecondary: true };
const primaryOnly = { countSecondary: false };

describe('lastTrainedDate', () => {
  it('returns the most recent date where the muscle is primary', () => {
    expect(lastTrainedDate('chest', records, primaryOnly)).toBe('2026-11-09');
    expect(lastTrainedDate('triceps', records, primaryOnly)).toBe('2026-11-05');
  });

  it('counts secondary muscles only when enabled', () => {
    expect(lastTrainedDate('triceps', records, withSecondary)).toBe('2026-11-09');
    expect(lastTrainedDate('biceps', records, withSecondary)).toBe('2026-11-08');
    expect(lastTrainedDate('biceps', records, primaryOnly)).toBeUndefined();
  });

  it('is undefined for untrained muscles or no records', () => {
    expect(lastTrainedDate('calves', records, withSecondary)).toBeUndefined();
    expect(lastTrainedDate('chest', [], withSecondary)).toBeUndefined();
  });
});

describe('daysSince', () => {
  it('counts calendar days', () => {
    expect(daysSince(d('2026-11-10'), today)).toBe(0);
    expect(daysSince(d('2026-11-09'), today)).toBe(1);
    expect(daysSince(d('2026-10-31'), today)).toBe(10);
    expect(daysSince(d('2025-11-10'), today)).toBe(365);
  });

  it('is not fooled by DST (25-hour day)', () => {
    expect(daysSince(d('2026-10-24'), d('2026-10-26'))).toBe(2);
  });

  it('handles undefined and future dates', () => {
    expect(daysSince(undefined, today)).toBeUndefined();
    expect(daysSince(d('2026-11-12'), today)).toBe(0);
  });
});

describe('colorFor', () => {
  const t = { greenDays: 2, redDays: 10 };

  it('is pure green up to greenDays and pure red from redDays', () => {
    expect(colorFor(0, t)).toBe('hsl(120 70% 46%)');
    expect(colorFor(2, t)).toBe('hsl(120 70% 46%)');
    expect(colorFor(10, t)).toBe('hsl(0 70% 46%)');
    expect(colorFor(400, t)).toBe('hsl(0 70% 46%)');
  });

  it('interpolates the hue linearly in between', () => {
    expect(colorFor(6, t)).toBe('hsl(60 70% 46%)');
    expect(colorFor(4, t)).toBe('hsl(90 70% 46%)');
    expect(hueFor(3, { greenDays: 0, redDays: 9 })).toBeCloseTo(80);
  });

  it('is neutral grey when never trained', () => {
    expect(colorFor(undefined, t)).toBe(NEUTRAL_COLOR);
  });

  it('falls back to default thresholds when invalid', () => {
    expect(colorFor(6, { greenDays: 10, redDays: 2 })).toBe('hsl(60 70% 46%)');
  });
});

describe('validateThresholds', () => {
  it('requires 0 ≤ green < red, integers', () => {
    expect(validateThresholds({ greenDays: 2, redDays: 10 })).toBe(true);
    expect(validateThresholds({ greenDays: 0, redDays: 1 })).toBe(true);
    expect(validateThresholds({ greenDays: 5, redDays: 5 })).toBe(false);
    expect(validateThresholds({ greenDays: 6, redDays: 5 })).toBe(false);
    expect(validateThresholds({ greenDays: -1, redDays: 5 })).toBe(false);
    expect(validateThresholds({ greenDays: 1.5, redDays: 5 })).toBe(false);
  });
});

describe('muscleRecency', () => {
  it('computes every muscle in one pass, consistent with lastTrainedDate', () => {
    const all = muscleRecency(records, today, withSecondary);
    expect(all.chest).toEqual({ lastDate: '2026-11-09', days: 1 });
    expect(all.biceps).toEqual({ lastDate: '2026-11-08', days: 2 });
    expect(all.calves).toEqual({ lastDate: undefined, days: undefined });
    expect(muscleRecency(records, today, primaryOnly).biceps.days).toBeUndefined();
    expect(Object.keys(all)).toHaveLength(18);
  });
});

describe('recentExercises', () => {
  it('lists distinct exercises, most recent first, with their role', () => {
    expect(recentExercises('triceps', records, withSecondary)).toEqual([
      { exerciseId: BENCH, date: '2026-11-09', asSecondary: true },
      { exerciseId: PUSHDOWN, date: '2026-11-05', asSecondary: false },
    ]);
    expect(recentExercises('triceps', records, primaryOnly)).toEqual([
      { exerciseId: PUSHDOWN, date: '2026-11-05', asSecondary: false },
    ]);
    expect(recentExercises('triceps', records, withSecondary, 1)).toHaveLength(1);
    expect(recentExercises('calves', records, withSecondary)).toEqual([]);
  });
});

describe('setsInLastDays', () => {
  it('counts sets in the window, today included', () => {
    // window for 7 days: 2026-11-04 … 2026-11-10
    expect(setsInLastDays('chest', records, today, 7, withSecondary)).toBe(1);
    expect(setsInLastDays('triceps', records, today, 7, withSecondary)).toBe(2);
    expect(setsInLastDays('triceps', records, today, 7, primaryOnly)).toBe(1);
    expect(setsInLastDays('chest', records, today, 10, withSecondary)).toBe(3);
    expect(setsInLastDays('calves', records, today, 7, withSecondary)).toBe(0);
  });
});

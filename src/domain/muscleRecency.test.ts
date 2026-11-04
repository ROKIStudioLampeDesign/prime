import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import {
  colorFor,
  colorForIntensity,
  freshness,
  daysSince,
  hueFor,
  lastTrainedDate,
  muscleRecency,
  SECONDARY_WEIGHT,
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

describe('freshness', () => {
  const t = { freshDays: 2, staleDays: 10 };

  it('is 1 up to freshDays, 0 from staleDays, linear in between', () => {
    expect(freshness(0, t)).toBe(1);
    expect(freshness(2, t)).toBe(1);
    expect(freshness(6, t)).toBe(0.5);
    expect(freshness(10, t)).toBe(0);
    expect(freshness(400, t)).toBe(0);
  });

  it('falls back to default thresholds when invalid', () => {
    expect(freshness(6, { freshDays: 10, staleDays: 2 })).toBe(0.5);
  });
});

describe('colorFor', () => {
  const t = { freshDays: 2, staleDays: 10 };

  it('is pure red when just trained and pure green from staleDays', () => {
    expect(colorFor(0, t)).toBe('hsl(0 70% 46%)');
    expect(colorFor(2, t)).toBe('hsl(0 70% 46%)');
    expect(colorFor(10, t)).toBe('hsl(120 70% 46%)');
    expect(colorFor(400, t)).toBe('hsl(120 70% 46%)');
  });

  it('interpolates the hue linearly in between', () => {
    expect(colorFor(6, t)).toBe('hsl(60 70% 46%)');
    expect(colorFor(4, t)).toBe('hsl(30 70% 46%)');
    expect(hueFor(0.25)).toBeCloseTo(90);
  });

  it('is neutral grey when never trained', () => {
    expect(colorFor(undefined, t)).toBe(NEUTRAL_COLOR);
    expect(colorForIntensity(undefined)).toBe(NEUTRAL_COLOR);
  });

  it('clamps intensities outside 0–1', () => {
    expect(colorForIntensity(2)).toBe('hsl(0 70% 46%)');
    expect(colorForIntensity(-1)).toBe('hsl(120 70% 46%)');
  });
});

describe('validateThresholds', () => {
  it('requires 0 ≤ fresh < stale, integers', () => {
    expect(validateThresholds({ freshDays: 2, staleDays: 10 })).toBe(true);
    expect(validateThresholds({ freshDays: 0, staleDays: 1 })).toBe(true);
    expect(validateThresholds({ freshDays: 5, staleDays: 5 })).toBe(false);
    expect(validateThresholds({ freshDays: 6, staleDays: 5 })).toBe(false);
    expect(validateThresholds({ freshDays: -1, staleDays: 5 })).toBe(false);
    expect(validateThresholds({ freshDays: 1.5, staleDays: 5 })).toBe(false);
  });
});

describe('muscleRecency', () => {
  const t = { freshDays: 2, staleDays: 10 };

  it('computes every muscle in one pass, consistent with lastTrainedDate', () => {
    const all = muscleRecency(records, today, withSecondary, t);
    expect(all.chest).toMatchObject({ lastDate: '2026-11-09', days: 1 });
    expect(all.biceps).toMatchObject({ lastDate: '2026-11-08', days: 2 });
    expect(all.calves).toEqual({ lastDate: undefined, days: undefined });
    expect(muscleRecency(records, today, primaryOnly, t).biceps.days).toBeUndefined();
    expect(Object.keys(all)).toHaveLength(18);
  });

  it('weighs a secondary muscle at half a primary one', () => {
    const all = muscleRecency(records, today, withSecondary, t);
    expect(all.chest.intensity).toBe(1); // primary, yesterday
    expect(all.biceps.intensity).toBe(SECONDARY_WEIGHT); // secondary only, 2 days ago
    expect(all.shoulders_front.intensity).toBe(SECONDARY_WEIGHT);
    expect(all.calves.intensity).toBeUndefined();
  });

  it('keeps the strongest of primary and secondary work', () => {
    // Triceps: secondary yesterday (0.5 × 1) vs primary 5 days ago (1 × 0.625).
    const all = muscleRecency(records, today, withSecondary, t);
    expect(all.triceps.intensity).toBeCloseTo(0.625);
    expect(muscleRecency(records, today, primaryOnly, t).triceps.intensity).toBeCloseTo(0.625);
  });

  it('fades to 0 once stale, but stays coloured (not "never trained")', () => {
    const old = [rec('2026-10-01', BENCH, ['chest'], [])];
    expect(muscleRecency(old, today, withSecondary, t).chest.intensity).toBe(0);
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

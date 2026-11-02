import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import {
  epley1RM,
  latestRecordDate,
  personalRecords,
  recordsBeaten,
  sessionProgression,
  type HistorySet,
} from './strength';

const set = (workoutId: number, day: number, weightKg: number, reps: number): HistorySet => ({
  workoutId,
  date: `2026-10-${String(day).padStart(2, '0')}` as LocalDate,
  startedAt: day * 1000,
  weightKg,
  reps,
});

describe('epley1RM', () => {
  it('applies weight × (1 + reps / 30)', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.667, 3);
    expect(epley1RM(60, 10)).toBeCloseTo(80);
    expect(epley1RM(100, 12)).toBeCloseTo(140);
  });

  it('returns the weight itself for a single rep', () => {
    expect(epley1RM(140, 1)).toBe(140);
  });

  it('ignores sets above 12 reps, without load, or with invalid reps', () => {
    expect(epley1RM(50, 13)).toBeUndefined();
    expect(epley1RM(0, 5)).toBeUndefined();
    expect(epley1RM(50, 0)).toBeUndefined();
    expect(epley1RM(50, 2.5)).toBeUndefined();
    expect(epley1RM(NaN, 5)).toBeUndefined();
  });
});

const history = [
  set(1, 1, 60, 10),
  set(1, 1, 70, 5),
  set(2, 8, 72.5, 6),
  set(2, 8, 50, 20), // too many reps for 1RM, but a volume of 1000
  set(3, 15, 0, 12), // bodyweight only
];

describe('sessionProgression', () => {
  it('takes the heaviest weight per session, in order', () => {
    expect(sessionProgression(history, 'maxWeight').map((s) => [s.workoutId, s.value])).toEqual([
      [1, 70],
      [2, 72.5],
    ]);
  });

  it('takes the best estimated 1RM per session, skipping >12-rep sets and empty sessions', () => {
    const e = sessionProgression(history, 'e1rm');
    expect(e.map((s) => s.workoutId)).toEqual([1, 2]);
    expect(e[0]?.value).toBeCloseTo(81.667, 3); // 70 × (1 + 5/30) beats 60 × (1 + 10/30) = 80
    expect(e[1]?.value).toBeCloseTo(87); // 72.5 × 1.2
  });

  it('is empty without history', () => {
    expect(sessionProgression([], 'maxWeight')).toEqual([]);
  });
});

describe('personalRecords', () => {
  it('finds the heaviest weight, best 1RM and best single-set volume with their dates', () => {
    const prs = personalRecords(history);
    expect(prs.weight).toMatchObject({ value: 72.5, reps: 6, date: '2026-10-08' });
    expect(prs.e1rm).toMatchObject({ weightKg: 72.5, date: '2026-10-08' });
    expect(prs.e1rm?.value).toBeCloseTo(87);
    expect(prs.volume).toMatchObject({ value: 1000, weightKg: 50, reps: 20 });
  });

  it('keeps the first set on ties', () => {
    const prs = personalRecords([set(1, 1, 100, 1), set(2, 2, 100, 1)]);
    expect(prs.weight?.workoutId).toBe(1);
  });

  it('is empty for bodyweight-only or no history', () => {
    expect(personalRecords([set(1, 1, 0, 15)])).toEqual({});
    expect(personalRecords([])).toEqual({});
  });

  it('reports the latest record date', () => {
    expect(latestRecordDate(personalRecords(history))).toBe('2026-10-08');
    expect(latestRecordDate({})).toBeUndefined();
  });
});

describe('recordsBeaten', () => {
  const previous = personalRecords(history);

  it('lists the kinds a set strictly beats', () => {
    expect(recordsBeaten({ weightKg: 75, reps: 5 }, previous)).toEqual(['weight', 'e1rm']); // 1RM 87.5 > 87
  });

  it('detects 1RM and volume records independently', () => {
    expect(recordsBeaten({ weightKg: 72.5, reps: 8 }, previous)).toEqual(['e1rm']); // 1RM 91.8, volume 580
    expect(recordsBeaten({ weightKg: 40, reps: 30 }, previous)).toEqual(['volume']);
    expect(recordsBeaten({ weightKg: 80, reps: 13 }, previous)).toEqual(['weight', 'volume']);
  });

  it('does not report equal values, empty sets, or kinds without a previous record', () => {
    expect(recordsBeaten({ weightKg: 72.5, reps: 6 }, previous)).toEqual([]);
    expect(recordsBeaten({ weightKg: 0, reps: 50 }, previous)).toEqual([]);
    expect(recordsBeaten({ weightKg: 200, reps: 1 }, {})).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import {
  epley1RM,
  latestRecordDate,
  liftGoalProgress,
  personalRecords,
  recordsBeaten,
  bestSoFar,
  sessionProgression,
  sessionRecordHolders,
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

describe('liftGoalProgress', () => {
  it('has no progress without a positive goal', () => {
    expect(liftGoalProgress({}, undefined)).toBeUndefined();
    expect(liftGoalProgress({}, 0)).toBeUndefined();
  });

  it('starts at zero before any lift', () => {
    expect(liftGoalProgress({}, 120)).toEqual({
      goalKg: 120,
      bestKg: 0,
      ratio: 0,
      remainingKg: 120,
      reached: false,
    });
  });

  it('counts the heaviest real load, not the estimated 1RM', () => {
    // 100 × 8 estimates far above 120, but only 100 kg was actually lifted.
    const progress = liftGoalProgress(personalRecords([set(1, 1, 100, 8), set(2, 2, 90, 1)]), 120);
    expect(progress).toMatchObject({ bestKg: 100, remainingKg: 20, reached: false });
    expect(progress?.ratio).toBeCloseTo(100 / 120);
  });

  it('is reached exactly at the goal and caps past it', () => {
    expect(liftGoalProgress(personalRecords([set(1, 1, 120, 1)]), 120)).toMatchObject({
      ratio: 1,
      remainingKg: 0,
      reached: true,
    });
    expect(liftGoalProgress(personalRecords([set(1, 1, 125, 1)]), 120)).toMatchObject({
      bestKg: 125,
      ratio: 1,
      remainingKg: 0,
      reached: true,
    });
  });
});

describe('sessionRecordHolders', () => {
  const previous = personalRecords(history);
  const live = (id: number, weightKg: number, reps: number, completedAt?: number) => ({
    id,
    setNumber: id,
    weightKg,
    reps,
    completed: true,
    ...(completedAt !== undefined && { completedAt }),
  });

  it('gives each record to the single best set of the session only', () => {
    // Both beat the previous volume (580): only the bigger one is the all-time best.
    const holders = sessionRecordHolders([live(1, 40, 30, 10), live(2, 40, 25, 20)], previous);
    expect([...holders]).toEqual([[1, ['volume']]]);
  });

  it('lets a later set take the record from an earlier one', () => {
    const holders = sessionRecordHolders([live(1, 75, 5, 10), live(2, 77.5, 5, 20)], previous);
    expect(holders.get(1)).toBeUndefined();
    expect(holders.get(2)).toEqual(['weight', 'e1rm']);
  });

  it('keeps the record on the set validated first on ties, and splits kinds across sets', () => {
    expect([...sessionRecordHolders([live(2, 75, 5, 20), live(1, 75, 5, 10)], previous)]).toEqual([
      [1, ['weight', 'e1rm']],
    ]);
    const split = sessionRecordHolders([live(1, 80, 1, 10), live(2, 40, 30, 20)], previous);
    expect(split.get(1)).toEqual(['weight']);
    expect(split.get(2)).toEqual(['volume']);
  });

  it('only badges the kinds asked for: one set at most with the volume alone', () => {
    // Set 1 holds the heaviest load, set 2 the biggest volume: only set 2 is badged.
    const holders = sessionRecordHolders([live(1, 80, 1, 10), live(2, 40, 30, 20)], previous, ['volume']);
    expect([...holders]).toEqual([[2, ['volume']]]);
    // A heavier single that moves less than the previous best volume gets nothing.
    expect(sessionRecordHolders([live(1, 80, 1, 10)], previous, ['volume']).size).toBe(0);
  });

  it('ignores unvalidated sets, sets that only tie, and kinds without a previous record', () => {
    expect(sessionRecordHolders([{ ...live(1, 200, 1), completed: false }], previous).size).toBe(0);
    expect(sessionRecordHolders([live(1, 72.5, 6, 10)], previous).size).toBe(0);
    expect(sessionRecordHolders([live(1, 200, 1, 10)], {}).size).toBe(0);
    expect(sessionRecordHolders([], previous).size).toBe(0);
  });
});

describe('bestSoFar', () => {
  const p = (workoutId: number, value: number) => ({
    workoutId,
    date: '2026-11-02' as LocalDate,
    startedAt: workoutId,
    value,
  });

  it('never goes down: a lighter session keeps the previous best', () => {
    const out = bestSoFar([p(1, 70), p(2, 60), p(3, 72.5), p(4, 72.5), p(5, 65)]);
    expect(out.map((s) => s.value)).toEqual([70, 70, 72.5, 72.5, 72.5]);
  });

  it('flags only the sessions that set a new best (a tie is not one)', () => {
    const out = bestSoFar([p(1, 70), p(2, 60), p(3, 72.5), p(4, 72.5)]);
    expect(out.map((s) => s.isNewBest)).toEqual([true, false, true, false]);
  });

  it('handles no session', () => {
    expect(bestSoFar([])).toEqual([]);
  });
});

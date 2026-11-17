import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import { bestSet, compareFirstAndLast, comparePeriods, trendCounts } from './perfComparison';
import type { HistorySet } from './strength';

const d = (s: string) => s as LocalDate;
let workout = 0;
/** One finished session: its sets all share a workout id and start time. */
function session(date: string, sets: [number, number][]): HistorySet[] {
  workout += 1;
  const startedAt = new Date(`${date}T12:00:00`).getTime();
  return sets.map(([weightKg, reps]) => ({ workoutId: workout, date: d(date), startedAt, weightKg, reps }));
}

describe('bestSet', () => {
  it('is undefined without a set of at least one rep', () => {
    expect(bestSet([])).toBeUndefined();
    expect(bestSet([{ weightKg: 80, reps: 0 }])).toBeUndefined();
  });

  it('takes the highest estimated 1RM, a single being the weight itself', () => {
    expect(bestSet([{ weightKg: 100, reps: 1 }])?.score).toBe(100);
    const best = bestSet([
      { weightKg: 80, reps: 8 },
      { weightKg: 90, reps: 3 },
      { weightKg: 85, reps: 5 },
    ]);
    expect(best).toMatchObject({ weightKg: 80, reps: 8, bodyweight: false });
  });

  it('counts reps at bodyweight, and a weighted set wins over them', () => {
    expect(
      bestSet([
        { weightKg: 0, reps: 10 },
        { weightKg: 0, reps: 12 },
      ]),
    ).toMatchObject({
      reps: 12,
      bodyweight: true,
      score: 12,
    });
    expect(
      bestSet([
        { weightKg: 0, reps: 20 },
        { weightKg: 10, reps: 5 },
      ])?.bodyweight,
    ).toBe(false);
  });
});

describe('comparePeriods', () => {
  const thisWeek = { from: d('2026-11-16'), to: d('2026-11-22') };
  const lastWeek = { from: d('2026-11-09'), to: d('2026-11-15') };

  it('compares each exercise of the period with the previous one', () => {
    const history = new Map([
      [1, [...session('2026-11-10', [[72.5, 8]]), ...session('2026-11-17', [[75, 7]])]],
      [2, [...session('2026-11-11', [[100, 6]]), ...session('2026-11-18', [[100, 5]])]],
      [3, [...session('2026-11-11', [[0, 10]]), ...session('2026-11-18', [[0, 12]])]],
      [4, [...session('2026-11-12', [[70, 8]]), ...session('2026-11-19', [[70, 8]])]],
      [5, session('2026-11-20', [[40, 10]])], // new this week
      [6, session('2026-11-12', [[50, 10]])], // not done this week: left out
    ]);
    const rows = comparePeriods(history, thisWeek, lastWeek);
    const byId = new Map(rows.map((r) => [r.exerciseId, r]));
    expect(rows.map((r) => r.exerciseId)).toEqual([1, 2, 3, 4, 5]);
    expect(byId.get(1)?.trend).toBe('up');
    expect(byId.get(1)?.delta).toBeCloseTo(75 * (1 + 7 / 30) - 72.5 * (1 + 8 / 30));
    expect(byId.get(2)?.trend).toBe('down');
    expect(byId.get(3)).toMatchObject({ trend: 'up', delta: 2 });
    expect(byId.get(4)).toMatchObject({ trend: 'same', delta: 0 });
    expect(byId.get(5)?.trend).toBe('new');
    expect(byId.get(5)?.before).toBeUndefined();
    expect(trendCounts(rows)).toEqual({ up: 2, same: 1, down: 1 });
  });

  it('includes both ends of the periods and nothing outside', () => {
    const history = new Map([
      [
        1,
        [
          ...session('2026-11-08', [[200, 1]]),
          ...session('2026-11-09', [[60, 1]]),
          ...session('2026-11-22', [[61, 1]]),
        ],
      ],
    ]);
    expect(comparePeriods(history, thisWeek, lastWeek)[0]).toMatchObject({ trend: 'up', delta: 1 });
  });

  it('does not compare bodyweight with weighted sets', () => {
    const history = new Map([
      [1, [...session('2026-11-10', [[0, 15]]), ...session('2026-11-17', [[10, 8]])]],
    ]);
    const row = comparePeriods(history, thisWeek, lastWeek)[0];
    expect(row?.trend).toBe('same');
    expect(row?.delta).toBeUndefined();
  });

  it('is empty without history', () => {
    expect(comparePeriods(new Map(), thisWeek, lastWeek)).toEqual([]);
  });
});

describe('compareFirstAndLast', () => {
  const november = { from: d('2026-11-01'), to: d('2026-11-30') };

  it('compares the first and last session of the month, across month boundaries', () => {
    const history = new Map([
      [
        1,
        [
          ...session('2026-10-31', [[200, 1]]), // October: ignored
          ...session('2026-11-02', [[70, 8]]),
          ...session('2026-11-15', [[90, 1]]), // middle sessions don't matter
          ...session('2026-11-30', [[72.5, 8]]),
          ...session('2026-12-01', [[10, 1]]), // December: ignored
        ],
      ],
      [2, session('2026-11-05', [[50, 5]])], // a single session: nothing to compare
    ]);
    const rows = compareFirstAndLast(history, november);
    expect(rows[0]).toMatchObject({
      exerciseId: 1,
      trend: 'up',
      before: { weightKg: 70 },
      after: { weightKg: 72.5 },
    });
    expect(rows[1]).toMatchObject({ exerciseId: 2, trend: 'new' });
  });
});

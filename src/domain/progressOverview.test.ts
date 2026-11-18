import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import { recentRecords, weeklyVolumes } from './progressOverview';
import type { HistorySet } from './strength';

const d = (s: string) => s as LocalDate;
let id = 0;
const set = (date: string, weightKg: number, reps = 5): HistorySet => {
  id++;
  return { workoutId: id, date: d(date), startedAt: id, weightKg, reps };
};

describe('recentRecords', () => {
  it('lists sessions that beat every earlier one since the date, newest first', () => {
    const bench = [
      set('2026-10-01', 60),
      set('2026-10-20', 65),
      set('2026-11-03', 62.5),
      set('2026-11-10', 70),
    ];
    const squat = [set('2026-10-05', 100), set('2026-11-06', 105)];
    const out = recentRecords(
      new Map([
        [1, bench],
        [2, squat],
      ]),
      d('2026-10-19'),
    );
    expect(out.map((r) => [r.exerciseId, r.date, r.weightKg, r.previousKg])).toEqual([
      [1, '2026-11-10', 70, 65],
      [2, '2026-11-06', 105, 100],
      [1, '2026-10-20', 65, 60],
    ]);
  });

  it('never counts an exercise’s first session, nor a tie', () => {
    const out = recentRecords(
      new Map([[1, [set('2026-11-01', 60), set('2026-11-08', 60)]]]),
      d('2026-10-01'),
    );
    expect(out).toEqual([]);
  });

  it('includes a record on the first day of the period', () => {
    const out = recentRecords(
      new Map([[1, [set('2026-10-01', 60), set('2026-11-01', 62.5)]]]),
      d('2026-11-01'),
    );
    expect(out).toHaveLength(1);
  });

  it('handles no history', () => {
    expect(recentRecords(new Map(), d('2026-11-01'))).toEqual([]);
  });
});

describe('weeklyVolumes', () => {
  it('sums load × reps per Monday-based week, the current week last, empty weeks at 0', () => {
    const history = new Map([
      [1, [set('2026-11-02', 100, 5), set('2026-11-08', 50, 10), set('2026-11-16', 60, 5)]],
      [2, [set('2026-11-17', 0, 12)]],
    ]);
    // Wednesday 18 November: weeks of 26 Oct, 2 Nov, 9 Nov, 16 Nov.
    expect(weeklyVolumes(history, d('2026-11-18'), 4)).toEqual([
      { weekOf: '2026-10-26', volumeKg: 0 },
      { weekOf: '2026-11-02', volumeKg: 1000 },
      { weekOf: '2026-11-09', volumeKg: 0 },
      { weekOf: '2026-11-16', volumeKg: 300 },
    ]);
  });

  it('crosses a year boundary and ignores sets outside the window', () => {
    const history = new Map([[1, [set('2025-12-29', 40, 10), set('2025-12-01', 99, 1)]]]);
    expect(weeklyVolumes(history, d('2026-01-02'), 2)).toEqual([
      { weekOf: '2025-12-22', volumeKg: 0 },
      { weekOf: '2025-12-29', volumeKg: 400 },
    ]);
  });

  it('returns nothing for zero weeks', () => {
    expect(weeklyVolumes(new Map(), d('2026-11-18'), 0)).toEqual([]);
  });
});

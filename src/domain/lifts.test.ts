import { describe, expect, it } from 'vitest';
import type { LocalDate } from './date';
import {
  isLiftId,
  LIFT_IDS,
  liftBadgeDates,
  liftBadges,
  liftBadgesCrossed,
  liftRank,
  liftRankLabel,
  defaultPrTarget,
  prAttemptPlan,
  prAttemptSetsAfter,
  parseLiftParam,
  TRACKED_LIFTS,
} from './lifts';

const d = (s: string) => s as LocalDate;
const { bench, squat, deadlift, snatch } = TRACKED_LIFTS;
const diamant = (lift: (typeof TRACKED_LIFTS)[keyof typeof TRACKED_LIFTS]) => lift.fromKg + 7 * lift.stepKg;

describe('tracked lifts', () => {
  it('follows five lifts, each keyed by its own id', () => {
    expect(LIFT_IDS).toEqual(['bench', 'squat', 'deadlift', 'power-clean', 'snatch']);
    for (const id of LIFT_IDS) expect(TRACKED_LIFTS[id].id).toBe(id);
  });

  it('puts Diamant at a strong amateur single for each lift', () => {
    expect(LIFT_IDS.map((id) => diamant(TRACKED_LIFTS[id]))).toEqual([130, 180, 200, 110, 75]);
  });

  it('reads the lift from the URL, falling back to the bench', () => {
    expect(parseLiftParam('squat')).toBe('squat');
    expect(parseLiftParam('power-clean')).toBe('power-clean');
    expect(parseLiftParam(null)).toBe('bench');
    expect(parseLiftParam('curl')).toBe('bench');
    expect(parseLiftParam('')).toBe('bench');
    expect(isLiftId('toString')).toBe(false);
  });
});

describe('liftBadges', () => {
  it('lists bench milestones every 10 kg from 60 to 140, unlocked by the best lift', () => {
    const badges = liftBadges(bench, 80);
    expect(badges.map((b) => b.kg)).toEqual([60, 70, 80, 90, 100, 110, 120, 130, 140]);
    expect(badges.filter((b) => b.unlocked).map((b) => b.kg)).toEqual([60, 70, 80]);
    expect(liftBadges(bench, 0).every((b) => !b.unlocked)).toBe(true);
  });

  it('follows each lift’s own scale', () => {
    expect(liftBadges(squat, 0).map((b) => b.kg)).toEqual([75, 90, 105, 120, 135, 150, 165, 180, 195]);
    expect(
      liftBadges(snatch, 52.5)
        .filter((b) => b.unlocked)
        .map((b) => b.kg),
    ).toEqual([40, 45, 50]);
  });

  it('unlocks a milestone exactly at its load', () => {
    expect(
      liftBadges(deadlift, 100)
        .filter((b) => b.unlocked)
        .map((b) => b.kg),
    ).toEqual([60, 80, 100]);
    expect(
      liftBadges(deadlift, 99.5)
        .filter((b) => b.unlocked)
        .map((b) => b.kg),
    ).toEqual([60, 80]);
  });

  it('keeps going two milestones past the best lift beyond Radiant I', () => {
    expect(liftBadges(bench, 135).at(-1)?.kg).toBe(150);
    expect(liftBadges(squat, 200).at(-1)?.kg).toBe(225);
  });

  it('reports the milestones a session crossed', () => {
    expect(liftBadgesCrossed(bench, 78, 92.5)).toEqual([80, 90]);
    expect(liftBadgesCrossed(bench, 80, 82.5)).toEqual([]);
    expect(liftBadgesCrossed(bench, 0, 60)).toEqual([60]);
    expect(liftBadgesCrossed(squat, 100, 125)).toEqual([105, 120]);
  });
});

describe('liftRank', () => {
  it('names each bench milestone: two divisions per metal, Rubis, Diamant, then Radiant', () => {
    const labels = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 200].map((kg) =>
      liftRankLabel(bench, kg),
    );
    expect(labels).toEqual([
      'Bronze I',
      'Bronze II',
      'Argent I',
      'Argent II',
      'Or I',
      'Or II',
      'Rubis',
      'Diamant',
      'Radiant I',
      'Radiant II',
      'Radiant III',
      'Radiant III',
    ]);
  });

  it('ranks other lifts on their own scale', () => {
    expect(liftRankLabel(squat, 180)).toBe('Diamant');
    expect(liftRankLabel(deadlift, 140)).toBe('Or I');
    expect(liftRankLabel(snatch, 70)).toBe('Rubis');
    // Between two milestones: the one below.
    expect(liftRankLabel(squat, 100)).toBe('Bronze II');
    // Under the first milestone: Bronze I (never shown, but never undefined).
    expect(liftRankLabel(squat, 20)).toBe('Bronze I');
  });

  it('gives each tier its level of ornaments', () => {
    expect([60, 80, 100, 120, 130, 140].map((kg) => liftRank(bench, kg).tier)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(liftRank(bench, 120).division).toBe(0);
    expect(liftRank(bench, 130).division).toBe(0);
  });
});

describe('liftBadgeDates', () => {
  it('dates each milestone by the first set that reached it, ignoring 0-rep sets', () => {
    const history = [
      { weightKg: 75, reps: 3, date: d('2026-09-01'), startedAt: 1 },
      { weightKg: 90, reps: 0, date: d('2026-09-15'), startedAt: 2 },
      { weightKg: 82.5, reps: 1, date: d('2026-10-20'), startedAt: 3 },
    ];
    const dates = liftBadgeDates(history, [60, 70, 80, 90]);
    expect(Object.fromEntries(dates)).toEqual({ 60: '2026-09-01', 70: '2026-09-01', 80: '2026-10-20' });
  });

  it('returns nothing without history', () => {
    expect(liftBadgeDates([], [60]).size).toBe(0);
  });
});

describe('PR attempt plan', () => {
  it('ramps from the empty bar to a single at the target, loads rounded to 2.5 kg', () => {
    expect(prAttemptPlan(82.5)).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 42.5, reps: 5 },
      { weightKg: 57.5, reps: 3 },
      { weightKg: 70, reps: 1 },
      { weightKg: 75, reps: 1 },
      { weightKg: 82.5, reps: 1 },
    ]);
  });

  it('skips ramp steps at or under the bar for light targets', () => {
    expect(prAttemptPlan(30)).toEqual([
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

  it('skips the warm-up already done this session, never the attempt', () => {
    const plan = prAttemptPlan(82.5);
    expect(prAttemptSetsAfter(plan, 0)).toEqual(plan);
    expect(prAttemptSetsAfter(plan, 60)).toEqual([
      { weightKg: 70, reps: 1 },
      { weightKg: 75, reps: 1 },
      { weightKg: 82.5, reps: 1 },
    ]);
    expect(prAttemptSetsAfter(plan, 90)).toEqual([{ weightKg: 82.5, reps: 1 }]);
    expect(prAttemptSetsAfter([], 50)).toEqual([]);
  });
});

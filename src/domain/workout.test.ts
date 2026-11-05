import { describe, expect, it } from 'vitest';
import {
  defaultSetCount,
  lastPerformance,
  nextSetValues,
  prefillFromPlan,
  prefillSets,
  previousForSet,
  restRemaining,
  startsAtBodyweight,
  stepWeight,
  templateAfterWorkout,
  templateFromSets,
  workoutStats,
  workoutVolume,
  type SetData,
  type WorkoutHistoryItem,
} from './workout';

const BENCH = 1;
const SQUAT = 2;

const set = (
  exerciseId: number,
  setNumber: number,
  weightKg: number,
  reps: number,
  completed = true,
): SetData => ({
  exerciseId,
  setNumber,
  weightKg,
  reps,
  completed,
});

const history: WorkoutHistoryItem[] = [
  { workoutId: 1, startedAt: 1000, sets: [set(BENCH, 1, 50, 10), set(BENCH, 2, 50, 9)] },
  {
    workoutId: 2,
    startedAt: 3000,
    sets: [set(BENCH, 1, 60, 8), set(BENCH, 2, 60, 7), set(BENCH, 3, 55, 8), set(SQUAT, 1, 100, 5)],
  },
  // Most recent, but bench was never completed here: skipped for bench.
  { workoutId: 3, startedAt: 5000, sets: [set(BENCH, 1, 70, 5, false), set(SQUAT, 1, 105, 5)] },
];

describe('lastPerformance', () => {
  it('returns the completed sets of the most recent workout with the exercise', () => {
    expect(lastPerformance(history, BENCH)).toEqual([
      { setNumber: 1, weightKg: 60, reps: 8 },
      { setNumber: 2, weightKg: 60, reps: 7 },
      { setNumber: 3, weightKg: 55, reps: 8 },
    ]);
    expect(lastPerformance(history, SQUAT)).toEqual([{ setNumber: 1, weightKg: 105, reps: 5 }]);
  });

  it('respects `before` and `excludeWorkoutId` (editing a past workout, or the current one)', () => {
    expect(lastPerformance(history, BENCH, { before: 3000 })?.[0]?.weightKg).toBe(50);
    expect(lastPerformance(history, SQUAT, { excludeWorkoutId: 3 })?.[0]?.weightKg).toBe(100);
  });

  it('is undefined for a never-performed exercise or empty history', () => {
    expect(lastPerformance(history, 99)).toBeUndefined();
    expect(lastPerformance([], BENCH)).toBeUndefined();
  });

  it('sorts sets by set number whatever the storage order', () => {
    const shuffled = [{ workoutId: 9, startedAt: 1, sets: [set(BENCH, 2, 20, 2), set(BENCH, 1, 10, 1)] }];
    expect(lastPerformance(shuffled, BENCH)?.map((s) => s.setNumber)).toEqual([1, 2]);
  });
});

describe('prefill', () => {
  const previous = [
    { setNumber: 1, weightKg: 60, reps: 8 },
    { setNumber: 2, weightKg: 57.5, reps: 7 },
  ];

  it('uses the same set number, falling back to the last set', () => {
    expect(prefillSets(previous, 3)).toEqual([
      { setNumber: 1, weightKg: 60, reps: 8 },
      { setNumber: 2, weightKg: 57.5, reps: 7 },
      { setNumber: 3, weightKg: 57.5, reps: 7 },
    ]);
  });

  it('uses fewer sets than the previous performance when asked', () => {
    expect(prefillSets(previous, 1)).toEqual([{ setNumber: 1, weightKg: 60, reps: 8 }]);
    expect(prefillSets(previous, 0)).toEqual([]);
  });

  it('falls back to 0 kg and the target reps without history', () => {
    expect(prefillSets(undefined, 2, 10)).toEqual([
      { setNumber: 1, weightKg: 0, reps: 10 },
      { setNumber: 2, weightKg: 0, reps: 10 },
    ]);
    expect(prefillSets([], 1)).toEqual([{ setNumber: 1, weightKg: 0, reps: 0 }]);
  });

  it('prefers history over target reps', () => {
    expect(prefillSets(previous, 1, 12)[0]?.reps).toBe(8);
  });

  it('previousForSet falls back to the last set', () => {
    expect(previousForSet(previous, 2)?.weightKg).toBe(57.5);
    expect(previousForSet(previous, 5)?.weightKg).toBe(57.5);
    expect(previousForSet(undefined, 1)).toBeUndefined();
  });

  it('defaults to the previous set count, else 3', () => {
    expect(defaultSetCount(previous)).toBe(2);
    expect(defaultSetCount(undefined)).toBe(3);
    expect(defaultSetCount([])).toBe(3);
  });

  it('nextSetValues: exact previous set, else copy the current last set', () => {
    const three = [...previous, { setNumber: 3, weightKg: 55, reps: 9 }];
    expect(
      nextSetValues(
        [
          { weightKg: 62.5, reps: 8 },
          { weightKg: 62.5, reps: 7 },
        ],
        three,
      ),
    ).toEqual({
      setNumber: 3,
      weightKg: 55,
      reps: 9,
    });
    expect(
      nextSetValues(
        [
          { weightKg: 62.5, reps: 8 },
          { weightKg: 62.5, reps: 7 },
        ],
        previous,
      ),
    ).toEqual({
      setNumber: 3,
      weightKg: 62.5,
      reps: 7,
    });
    expect(nextSetValues([], undefined)).toEqual({ setNumber: 1, weightKg: 0, reps: 0 });
    expect(nextSetValues([], previous)).toEqual({ setNumber: 1, weightKg: 60, reps: 8 });
  });
});

describe('volume and stats', () => {
  const sets = [
    set(BENCH, 1, 60, 8),
    set(BENCH, 2, 62.5, 6),
    set(BENCH, 3, 100, 10, false),
    set(SQUAT, 1, 0, 15),
  ];

  it('sums weight × reps over completed sets only', () => {
    expect(workoutVolume(sets)).toBe(480 + 375);
    expect(workoutVolume([])).toBe(0);
  });

  it('ignores negative values', () => {
    expect(workoutVolume([set(BENCH, 1, -10, 5), set(BENCH, 2, 10, -5)])).toBe(0);
  });

  it('computes stats with duration', () => {
    expect(workoutStats({ startedAt: 0, endedAt: 3_600_000 }, sets)).toEqual({
      volumeKg: 855,
      completedSets: 3,
      exercises: 2,
      durationMs: 3_600_000,
    });
    expect(workoutStats({ startedAt: 1000 }, sets).durationMs).toBeUndefined();
    expect(workoutStats({ startedAt: 1000 }, sets, 61_000).durationMs).toBe(60_000);
    expect(workoutStats({ startedAt: 5000 }, [], 1000).durationMs).toBe(0);
  });
});

describe('stepWeight', () => {
  it('steps without float drift and never goes below 0', () => {
    expect(stepWeight(60, 2.5)).toBe(62.5);
    expect(stepWeight(0.1, 0.2)).toBe(0.3);
    expect(stepWeight(61.25, 1.25)).toBe(62.5);
    expect(stepWeight(1, -2.5)).toBe(0);
    expect(stepWeight(NaN, 0.5)).toBe(0.5);
  });
});

describe('restRemaining', () => {
  it('counts down from timestamps and stops at 0', () => {
    expect(restRemaining(90_000, 0)).toBe(90);
    expect(restRemaining(90_000, 89_001)).toBe(1);
    expect(restRemaining(90_000, 90_000)).toBe(0);
    // e.g. after the phone was locked well past the end
    expect(restRemaining(90_000, 500_000)).toBe(0);
  });
});

describe('templateFromSets', () => {
  it('keeps exercise order, set count, last reps and every set', () => {
    expect(
      templateFromSets([
        { exerciseId: SQUAT, order: 1, setNumber: 1, weightKg: 100, reps: 5 },
        { exerciseId: BENCH, order: 0, setNumber: 2, weightKg: 62.5, reps: 6 },
        { exerciseId: BENCH, order: 0, setNumber: 1, weightKg: 60, reps: 8 },
        { exerciseId: SQUAT, order: 1, setNumber: 2, weightKg: 100, reps: 0 },
      ]),
    ).toEqual([
      {
        exerciseId: BENCH,
        targetSets: 2,
        targetReps: 6,
        sets: [
          { weightKg: 60, reps: 8 },
          { weightKg: 62.5, reps: 6 },
        ],
      },
      {
        exerciseId: SQUAT,
        targetSets: 2,
        sets: [
          { weightKg: 100, reps: 5 },
          { weightKg: 100, reps: 0 },
        ],
      },
    ]);
    expect(templateFromSets([])).toEqual([]);
  });
});

describe('templateAfterWorkout', () => {
  const template = [
    { exerciseId: BENCH, targetSets: 3, targetReps: 8 },
    {
      exerciseId: SQUAT,
      targetSets: 2,
      sets: [
        { weightKg: 100, reps: 5 },
        { weightKg: 100, reps: 5 },
      ],
    },
  ];

  it('copies the validated sets of each exercise, in the template order', () => {
    const done = [
      { exerciseId: SQUAT, setNumber: 1, weightKg: 105, reps: 5 },
      { exerciseId: BENCH, setNumber: 2, weightKg: 62.5, reps: 7 },
      { exerciseId: BENCH, setNumber: 1, weightKg: 62.5, reps: 8 },
    ];
    expect(templateAfterWorkout(template, [SQUAT, BENCH], done)).toEqual([
      {
        exerciseId: BENCH,
        targetSets: 2,
        targetReps: 7,
        sets: [
          { weightKg: 62.5, reps: 8 },
          { weightKg: 62.5, reps: 7 },
        ],
      },
      { exerciseId: SQUAT, targetSets: 1, targetReps: 5, sets: [{ weightKg: 105, reps: 5 }] },
    ]);
  });

  it('keeps the plan of an exercise with no validated set', () => {
    const done = [{ exerciseId: BENCH, setNumber: 1, weightKg: 60, reps: 8 }];
    expect(templateAfterWorkout(template, [BENCH, SQUAT], done)?.[1]).toBe(template[1]);
  });

  it('leaves the template alone when exercises were added or removed', () => {
    const done = [{ exerciseId: BENCH, setNumber: 1, weightKg: 60, reps: 8 }];
    expect(templateAfterWorkout(template, [BENCH], done)).toBeUndefined();
    expect(templateAfterWorkout(template, [BENCH, SQUAT, 99], done)).toBeUndefined();
    expect(templateAfterWorkout(template, [BENCH, 99], done)).toBeUndefined();
    expect(templateAfterWorkout([], [], [])).toEqual([]);
  });
});

describe('prefillFromPlan', () => {
  const previous = [
    { setNumber: 1, weightKg: 70, reps: 6 },
    { setNumber: 2, weightKg: 72.5, reps: 5 },
  ];

  it('uses the planned load and reps of each set', () => {
    expect(
      prefillFromPlan(previous, [
        { weightKg: 60, reps: 10 },
        { weightKg: 65, reps: 8 },
      ]),
    ).toEqual([
      { setNumber: 1, weightKg: 60, reps: 10 },
      { setNumber: 2, weightKg: 65, reps: 8 },
    ]);
  });

  it('falls back to last time where the plan has 0, then to the fallback reps', () => {
    expect(
      prefillFromPlan(previous, [
        { weightKg: 0, reps: 0 },
        { weightKg: 0, reps: 9 },
        { weightKg: 50, reps: 0 },
      ]),
    ).toEqual([
      { setNumber: 1, weightKg: 70, reps: 6 },
      { setNumber: 2, weightKg: 72.5, reps: 9 },
      { setNumber: 3, weightKg: 50, reps: 5 },
    ]);
    expect(prefillFromPlan(undefined, [{ weightKg: 0, reps: 0 }], 12)).toEqual([
      { setNumber: 1, weightKg: 0, reps: 12 },
    ]);
    expect(prefillFromPlan(previous, [])).toEqual([]);
  });
});

describe('startsAtBodyweight', () => {
  const kg = { weightKg: 20, reps: 8 };
  const bw = { weightKg: 0, reps: 8, bodyweight: true };

  it('follows the sets already in the workout first', () => {
    expect(startsAtBodyweight([bw], [kg], undefined)).toBe(true);
    expect(startsAtBodyweight([kg], [bw], 'bodyweight')).toBe(false);
  });

  it('then the last performance, then the equipment', () => {
    expect(startsAtBodyweight([], [bw], 'barbell')).toBe(true);
    expect(startsAtBodyweight([], [kg], 'bodyweight')).toBe(false);
    expect(startsAtBodyweight([], undefined, 'bodyweight')).toBe(true);
    expect(startsAtBodyweight([], [], 'barbell')).toBe(false);
    expect(startsAtBodyweight([], undefined, undefined)).toBe(false);
  });
});

describe('lastPerformance with bodyweight sets', () => {
  it('keeps the bodyweight flag only where it is set', () => {
    const history = [
      {
        workoutId: 1,
        startedAt: 1,
        sets: [
          { exerciseId: 7, setNumber: 1, weightKg: 0, reps: 10, completed: true, bodyweight: true },
          { exerciseId: 7, setNumber: 2, weightKg: 10, reps: 6, completed: true },
        ],
      },
    ];
    expect(lastPerformance(history, 7)).toEqual([
      { setNumber: 1, weightKg: 0, reps: 10, bodyweight: true },
      { setNumber: 2, weightKg: 10, reps: 6 },
    ]);
  });
});

describe('templates and bodyweight', () => {
  const bw = (setNumber: number, reps: number) => ({
    exerciseId: 7,
    setNumber,
    weightKg: 0,
    reps,
    bodyweight: true,
  });

  it('learns bodyweight only when every set of the exercise was at bodyweight', () => {
    const plan = [
      {
        exerciseId: 7,
        targetSets: 2,
        sets: [
          { weightKg: 10, reps: 12 },
          { weightKg: 10, reps: 12 },
        ],
      },
    ];
    expect(templateAfterWorkout(plan, [7], [bw(1, 15), bw(2, 14)])?.[0]).toMatchObject({ bodyweight: true });
    const mixed = [bw(1, 15), { exerciseId: 7, setNumber: 2, weightKg: 10, reps: 12 }];
    expect(templateAfterWorkout(plan, [7], mixed)?.[0]?.bodyweight).toBeUndefined();
  });

  it('keeps bodyweight when a workout is saved as a template', () => {
    const [entry] = templateFromSets([{ ...bw(1, 20), order: 0 }]);
    expect(entry).toMatchObject({ exerciseId: 7, bodyweight: true, sets: [{ weightKg: 0, reps: 20 }] });
  });
});

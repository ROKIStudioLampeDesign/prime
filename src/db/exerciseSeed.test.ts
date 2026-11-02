import { describe, expect, it } from 'vitest';
import { EQUIPMENT } from '../domain/exercise';
import { isMuscleId, MUSCLE_IDS, validateMuscleSelection } from '../domain/muscles';
import { EXERCISE_SEED } from './exerciseSeed';

describe('exercise seed', () => {
  it('has around 60+ exercises with unique ids and names', () => {
    expect(EXERCISE_SEED.length).toBeGreaterThanOrEqual(60);
    expect(new Set(EXERCISE_SEED.map((e) => e.seedId)).size).toBe(EXERCISE_SEED.length);
    expect(new Set(EXERCISE_SEED.map((e) => e.name)).size).toBe(EXERCISE_SEED.length);
  });

  it('only uses valid muscles and equipment, with a primary muscle and no overlap', () => {
    for (const e of EXERCISE_SEED) {
      expect([...e.primaryMuscles, ...e.secondaryMuscles].every(isMuscleId), e.seedId).toBe(true);
      expect(validateMuscleSelection(e.primaryMuscles, e.secondaryMuscles), e.seedId).toEqual({});
      expect(e.equipment && EQUIPMENT.includes(e.equipment), e.seedId).toBe(true);
    }
  });

  it('trains every muscle as a primary mover at least once', () => {
    const primaries = new Set(EXERCISE_SEED.flatMap((e) => e.primaryMuscles));
    expect([...MUSCLE_IDS].filter((m) => !primaries.has(m))).toEqual([]);
  });

  it('maps key exercises correctly', () => {
    const byId = new Map(EXERCISE_SEED.map((e) => [e.seedId, e]));
    expect(byId.get('bench-press')?.primaryMuscles).toEqual(['chest']);
    expect(byId.get('pull-up')?.primaryMuscles).toEqual(['lats']);
    expect(byId.get('back-squat')?.primaryMuscles).toEqual(['quads', 'glutes']);
    expect(byId.get('lateral-raise')?.primaryMuscles).toEqual(['shoulders_side']);
  });
});

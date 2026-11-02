import { describe, expect, it } from 'vitest';
import {
  isMuscleId,
  MUSCLE_GROUP_LABELS,
  MUSCLE_IDS,
  MUSCLES,
  musclesForView,
  musclesInGroup,
  validateMuscleSelection,
} from './muscles';

describe('muscle model', () => {
  it('has 18 unique muscles, each with a French label and at least one view', () => {
    expect(MUSCLE_IDS).toHaveLength(18);
    expect(new Set(MUSCLE_IDS).size).toBe(18);
    for (const id of MUSCLE_IDS) {
      expect(MUSCLES[id].label.length).toBeGreaterThan(0);
      expect(MUSCLES[id].views.length).toBeGreaterThan(0);
      expect(MUSCLE_GROUP_LABELS[MUSCLES[id].group]).toBeDefined();
    }
  });

  it('places muscles on the right views', () => {
    const front = musclesForView('front');
    const back = musclesForView('back');
    expect(front).toEqual(expect.arrayContaining(['chest', 'abs', 'quads', 'biceps']));
    expect(front).not.toContain('lats');
    expect(back).toEqual(expect.arrayContaining(['lats', 'glutes', 'hamstrings', 'triceps', 'lower_back']));
    expect(back).not.toContain('chest');
    // every muscle is drawable somewhere
    expect(new Set([...front, ...back]).size).toBe(18);
  });

  it('groups cover every muscle exactly once', () => {
    const all = [...musclesInGroup('upper'), ...musclesInGroup('core'), ...musclesInGroup('lower')];
    expect(all.sort()).toEqual([...MUSCLE_IDS].sort());
  });

  it('isMuscleId', () => {
    expect(isMuscleId('chest')).toBe(true);
    expect(isMuscleId('pecs')).toBe(false);
  });
});

describe('validateMuscleSelection', () => {
  it('requires a primary muscle and forbids overlap', () => {
    expect(validateMuscleSelection(['chest'], ['triceps'])).toEqual({});
    expect(validateMuscleSelection([], ['triceps'])).toEqual({ primary: 'required' });
    expect(validateMuscleSelection(['chest', 'triceps'], ['triceps'])).toEqual({ overlap: ['triceps'] });
  });
});

import { describe, expect, it } from 'vitest';
import {
  computeMacros,
  defaultSlotForHour,
  estimateKcal,
  goalProgress,
  hasKcalMismatch,
  roundMacro,
  roundMacros,
  roundTo,
  sumMacros,
  validateGoals,
  validatePer100g,
  ZERO_MACROS,
  type Per100g,
} from './nutrition';

const oats: Per100g = { kcal: 372, protein: 13.5, carbs: 58.7, sugars: 1.2, fat: 7, fiber: 10 };

describe('computeMacros', () => {
  it('scales per-100 g values', () => {
    expect(computeMacros(oats, 50)).toEqual({
      kcal: 186,
      protein: 6.75,
      carbs: 29.35,
      sugars: 0.6,
      fat: 3.5,
      fiber: 5,
    });
  });

  it('returns zeros for 0 g', () => {
    expect(computeMacros(oats, 0)).toEqual(ZERO_MACROS);
  });

  it('handles decimal grams', () => {
    expect(computeMacros(oats, 12.5).kcal).toBeCloseTo(46.5);
  });

  it('treats missing sugars and fiber as 0', () => {
    const m = computeMacros({ kcal: 100, protein: 10, carbs: 10, fat: 2 }, 200);
    expect(m.sugars).toBe(0);
    expect(m.fiber).toBe(0);
    expect(m.kcal).toBe(200);
  });

  it('treats negative or non-finite grams as 0', () => {
    expect(computeMacros(oats, -10)).toEqual(ZERO_MACROS);
    expect(computeMacros(oats, NaN)).toEqual(ZERO_MACROS);
    expect(computeMacros(oats, Infinity)).toEqual(ZERO_MACROS);
  });
});

describe('sumMacros', () => {
  it('returns zeros for an empty list', () => {
    expect(sumMacros([])).toEqual(ZERO_MACROS);
  });

  it('adds each nutrient', () => {
    const a = computeMacros(oats, 50);
    const total = sumMacros([a, a]);
    expect(total.kcal).toBe(372);
    expect(total.protein).toBeCloseTo(13.5);
  });

  it('does not mutate the zero constant', () => {
    sumMacros([computeMacros(oats, 100)]);
    expect(ZERO_MACROS.kcal).toBe(0);
  });
});

describe('rounding', () => {
  it('rounds half away from zero without float artefacts', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(0.15, 1)).toBe(0.2);
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(-2.5, 0)).toBe(-3);
    expect(roundTo(0, 1)).toBe(0);
  });

  it('rounds kcal to integers and other macros to 0.1', () => {
    expect(roundMacro('kcal', 186.5)).toBe(187);
    expect(roundMacro('protein', 6.75)).toBe(6.8);
    expect(roundMacros(computeMacros(oats, 33))).toEqual({
      kcal: 123,
      protein: 4.5,
      carbs: 19.4,
      sugars: 0.4,
      fat: 2.3,
      fiber: 3.3,
    });
  });
});

describe('goalProgress', () => {
  it('reports under, remaining and ratio', () => {
    expect(goalProgress(1500, 2000, 'target')).toEqual({
      ratio: 0.75,
      remaining: 500,
      status: 'under',
      bad: false,
    });
  });

  it('counts a target as reached from 95 %', () => {
    expect(goalProgress(1900, 2000, 'target').status).toBe('reached');
    expect(goalProgress(1899, 2000, 'target').status).toBe('under');
    expect(goalProgress(2000, 2000, 'target').status).toBe('reached');
  });

  it('flags going over a target or a max as bad', () => {
    expect(goalProgress(2100, 2000, 'target')).toMatchObject({ status: 'over', bad: true, remaining: -100 });
    expect(goalProgress(51, 50, 'max')).toMatchObject({ status: 'over', bad: true });
    expect(goalProgress(50, 50, 'max')).toMatchObject({ status: 'reached', bad: false });
    expect(goalProgress(10, 50, 'max').status).toBe('under');
  });

  it('treats exceeding a min goal as reached, not bad', () => {
    expect(goalProgress(180, 150, 'min')).toMatchObject({ status: 'reached', bad: false, ratio: 1.2 });
    expect(goalProgress(149, 150, 'min').status).toBe('under');
  });

  it('handles a goal of 0 without dividing by zero', () => {
    expect(goalProgress(0, 0, 'max')).toMatchObject({ ratio: 0, status: 'reached', bad: false });
    expect(goalProgress(5, 0, 'max')).toMatchObject({ ratio: 0, status: 'over', bad: true });
  });
});

describe('kcal coherence', () => {
  it('estimates kcal with Atwater factors', () => {
    expect(estimateKcal({ protein: 10, carbs: 20, fat: 5 })).toBe(165);
  });

  it('accepts usual label discrepancies', () => {
    expect(hasKcalMismatch(oats)).toBe(false); // estimate 351 vs 372 (fiber)
    expect(hasKcalMismatch({ kcal: 20, protein: 1, carbs: 2, fat: 0 })).toBe(false); // small absolute gap
  });

  it('flags large discrepancies, e.g. kJ typed as kcal', () => {
    expect(hasKcalMismatch({ ...oats, kcal: 1556 })).toBe(true);
    expect(hasKcalMismatch({ kcal: 100, protein: 20, carbs: 20, fat: 10 })).toBe(true);
  });
});

describe('validatePer100g', () => {
  it('accepts valid values and omits missing optional ones', () => {
    const r = validatePer100g({ kcal: 100, protein: 10, carbs: 10, fat: 2 });
    expect(r.errors).toEqual({});
    expect(r.value).toEqual({ kcal: 100, protein: 10, carbs: 10, fat: 2 });
    expect(r.value).not.toHaveProperty('sugars');
  });

  it('accepts zeros', () => {
    expect(
      validatePer100g({ kcal: 0, protein: 0, carbs: 0, sugars: 0, fat: 0, fiber: 0 }).value,
    ).toBeDefined();
  });

  it('requires kcal, protein, carbs and fat', () => {
    expect(validatePer100g({}).errors).toEqual({
      kcal: 'required',
      protein: 'required',
      carbs: 'required',
      fat: 'required',
    });
  });

  it('rejects negative, NaN and impossible values', () => {
    const r = validatePer100g({ kcal: -1, protein: NaN, carbs: 101, fat: 1, fiber: -0.1 });
    expect(r.errors).toEqual({ kcal: 'negative', protein: 'negative', carbs: 'tooHigh', fiber: 'negative' });
    expect(r.value).toBeUndefined();
    expect(validatePer100g({ kcal: 901, protein: 0, carbs: 0, fat: 100 }).errors.kcal).toBe('tooHigh');
  });

  it('rejects sugars above carbs', () => {
    const r = validatePer100g({ kcal: 100, protein: 0, carbs: 10, sugars: 12, fat: 0 });
    expect(r.errors).toEqual({ sugars: 'sugarsExceedCarbs' });
    expect(validatePer100g({ kcal: 40, protein: 0, carbs: 10, sugars: 10, fat: 0 }).errors).toEqual({});
  });

  it('reports a kcal mismatch as a warning, not an error', () => {
    const r = validatePer100g({ kcal: 600, protein: 13.5, carbs: 58.7, fat: 7 });
    expect(r.value).toBeDefined();
    expect(r.kcalMismatch).toBe(true);
  });
});

describe('validateGoals', () => {
  it('keeps provided values and drops empty ones', () => {
    expect(validateGoals({ kcal: 2200, protein: 150 })).toEqual({
      errors: {},
      value: { kcal: 2200, protein: 150 },
    });
    expect(validateGoals({}).value).toEqual({});
  });

  it('rejects negative and NaN values', () => {
    const r = validateGoals({ kcal: -1, fat: NaN, protein: 0 });
    expect(r.errors).toEqual({ kcal: 'negative', fat: 'negative' });
    expect(r.value).toBeUndefined();
  });
});

describe('defaultSlotForHour', () => {
  it('maps the time of day to a meal', () => {
    expect(defaultSlotForHour(7)).toBe('breakfast');
    expect(defaultSlotForHour(10)).toBe('breakfast');
    expect(defaultSlotForHour(11)).toBe('lunch');
    expect(defaultSlotForHour(16)).toBe('snack');
    expect(defaultSlotForHour(20)).toBe('dinner');
    expect(defaultSlotForHour(23)).toBe('snack');
    expect(defaultSlotForHour(2)).toBe('snack');
  });
});

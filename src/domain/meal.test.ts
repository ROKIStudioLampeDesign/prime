import { describe, expect, it } from 'vitest';
import {
  computeMealMacros,
  duplicateName,
  macrosPer100gCooked,
  macrosPerPortion,
  mealServingMacros,
  moveItem,
  scaleMacros,
  servingGrams,
  summarizeMeal,
  validateMeal,
} from './meal';
import { ZERO_MACROS, type Per100g } from './nutrition';

const rice: Per100g = { kcal: 350, protein: 7, carbs: 78, sugars: 0.2, fat: 1, fiber: 1 };
const chicken: Per100g = { kcal: 110, protein: 23, carbs: 0, fat: 2 }; // no sugars/fiber
const oil: Per100g = { kcal: 900, protein: 0, carbs: 0, fat: 100 };

// 200 g rice (700 kcal) + 300 g chicken (330 kcal) + 10 g oil (90 kcal) = 1120 kcal, 510 g raw.
const ingredients = [
  { grams: 200, per100g: rice },
  { grams: 300, per100g: chicken },
  { grams: 10, per100g: oil },
];

describe('computeMealMacros', () => {
  it('sums the ingredients', () => {
    const m = computeMealMacros(ingredients);
    expect(m.kcal).toBe(1120);
    expect(m.protein).toBe(14 + 69);
    expect(m.fat).toBe(2 + 6 + 10);
    expect(m.sugars).toBeCloseTo(0.4);
    expect(m.fiber).toBe(2);
  });

  it('returns zeros without ingredients', () => {
    expect(computeMealMacros([])).toEqual(ZERO_MACROS);
  });

  it('skips deleted products and 0 g ingredients', () => {
    expect(
      computeMealMacros([{ grams: 200, per100g: rice }, { grams: 500 }, { grams: 0, per100g: oil }]).kcal,
    ).toBe(700);
  });

  it('handles decimal grams', () => {
    expect(computeMealMacros([{ grams: 12.5, per100g: oil }]).fat).toBe(12.5);
  });
});

describe('macrosPerPortion', () => {
  const total = computeMealMacros(ingredients);

  it('divides by the number of portions, decimals included', () => {
    expect(macrosPerPortion(total, 4).kcal).toBe(280);
    expect(macrosPerPortion(total, 2.5).kcal).toBe(448);
  });

  it('treats a missing or invalid portion count as one portion', () => {
    expect(macrosPerPortion(total).kcal).toBe(1120);
    expect(macrosPerPortion(total, 0).kcal).toBe(1120);
    expect(macrosPerPortion(total, -2).kcal).toBe(1120);
    expect(macrosPerPortion(total, NaN).kcal).toBe(1120);
  });
});

describe('macrosPer100gCooked', () => {
  const total = computeMealMacros(ingredients);

  it('uses the cooked weight', () => {
    expect(macrosPer100gCooked(total, 800)?.kcal).toBe(140);
  });

  it('is undefined without a usable cooked weight', () => {
    expect(macrosPer100gCooked(total)).toBeUndefined();
    expect(macrosPer100gCooked(total, 0)).toBeUndefined();
    expect(macrosPer100gCooked(total, -5)).toBeUndefined();
  });
});

describe('summarizeMeal', () => {
  it('falls back to the raw weight without a cooked weight', () => {
    const s = summarizeMeal({ ingredients });
    expect(s).toMatchObject({
      rawWeight: 510,
      dishWeight: 510,
      usesCookedWeight: false,
      portionCount: 1,
      portionGrams: 510,
      missingCount: 0,
    });
    expect(s.per100g?.kcal).toBeCloseTo((1120 / 510) * 100);
  });

  it('uses the cooked weight and portions', () => {
    const s = summarizeMeal({ ingredients, cookedWeight: 800, portions: 4 });
    expect(s).toMatchObject({ dishWeight: 800, usesCookedWeight: true, portionCount: 4, portionGrams: 200 });
    expect(s.perPortion.kcal).toBe(280);
    expect(s.per100g?.kcal).toBe(140);
  });

  it('counts deleted products and excludes them from weight and macros', () => {
    const s = summarizeMeal({ ingredients: [...ingredients, { grams: 1000 }] });
    expect(s.missingCount).toBe(1);
    expect(s.rawWeight).toBe(510);
    expect(s.total.kcal).toBe(1120);
  });

  it('has no per-100 g values when the dish weighs nothing', () => {
    const s = summarizeMeal({ ingredients: [{ grams: 100 }] });
    expect(s.per100g).toBeUndefined();
    expect(s.portionGrams).toBe(0);
    expect(s.total).toEqual(ZERO_MACROS);
  });
});

describe('servings', () => {
  it('converts portions to grams', () => {
    expect(servingGrams({ portions: 1.5 }, 200)).toBe(300);
    expect(servingGrams({ grams: 250 }, 200)).toBe(250);
  });

  it('treats invalid servings as 0 g', () => {
    expect(servingGrams({ portions: 0 }, 200)).toBe(0);
    expect(servingGrams({ portions: -1 }, 200)).toBe(0);
    expect(servingGrams({ grams: NaN }, 200)).toBe(0);
  });

  it('computes macros eaten by portions or by grams', () => {
    const s = summarizeMeal({ ingredients, cookedWeight: 800, portions: 4 });
    expect(mealServingMacros(s, { portions: 1 }).kcal).toBeCloseTo(280);
    expect(mealServingMacros(s, { portions: 1.5 }).kcal).toBeCloseTo(420);
    expect(mealServingMacros(s, { grams: 400 }).kcal).toBeCloseTo(560);
    expect(mealServingMacros(s, { grams: 0 })).toEqual(ZERO_MACROS);
  });

  it('logs the whole dish per portion when portions are unset', () => {
    const s = summarizeMeal({ ingredients });
    expect(mealServingMacros(s, { portions: 1 }).kcal).toBeCloseTo(1120);
    expect(mealServingMacros(s, { portions: 0.5 }).kcal).toBeCloseTo(560);
  });

  it('returns zeros for a dish that weighs nothing', () => {
    const s = summarizeMeal({ ingredients: [] });
    expect(mealServingMacros(s, { portions: 1 })).toEqual(ZERO_MACROS);
  });
});

describe('scaleMacros', () => {
  it('scales every nutrient without mutating', () => {
    const m = { kcal: 100, protein: 10, carbs: 20, sugars: 5, fat: 2, fiber: 1 };
    expect(scaleMacros(m, 0.5)).toEqual({ kcal: 50, protein: 5, carbs: 10, sugars: 2.5, fat: 1, fiber: 0.5 });
    expect(m.kcal).toBe(100);
  });
});

describe('validateMeal', () => {
  it('accepts a valid meal with optional fields unset', () => {
    expect(validateMeal({ name: 'Chili', ingredientGrams: [200, 12.5] })).toEqual({
      invalidGrams: [],
      valid: true,
    });
  });

  it('reports every problem', () => {
    expect(validateMeal({ name: '  ', ingredientGrams: [], portions: 0, cookedWeight: -1 })).toEqual({
      name: 'required',
      ingredients: 'empty',
      invalidGrams: [],
      portions: 'invalid',
      cookedWeight: 'invalid',
      valid: false,
    });
  });

  it('flags missing, zero, negative and absurd ingredient quantities by index', () => {
    const r = validateMeal({ name: 'X', ingredientGrams: [100, 0, NaN, -5, 50000] });
    expect(r.invalidGrams).toEqual([1, 2, 3, 4]);
    expect(r.valid).toBe(false);
  });
});

describe('moveItem', () => {
  it('moves up and down without mutating', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(items, 0, 1)).toEqual(['b', 'a', 'c']);
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('ignores out-of-range moves', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
    expect(moveItem([], 0, 0)).toEqual([]);
  });
});

describe('duplicateName', () => {
  it('appends a copy suffix that does not collide', () => {
    expect(duplicateName('Chili', ['Chili'])).toBe('Chili (copie)');
    expect(duplicateName('Chili', ['Chili', 'Chili (copie)'])).toBe('Chili (copie 2)');
    expect(duplicateName('Chili (copie)', ['Chili', 'Chili (copie)', 'Chili (copie 2)'])).toBe(
      'Chili (copie 3)',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { MAX_FACTOR, PLAN_STEP_G, planQuantities, type PlanItem } from './mealPlanner';

/* The user's own products (per 100 g). */
const tuna = { kcal: 102, protein: 24, carbs: 0, fat: 0.7 };
const eggs = { kcal: 140, protein: 13, carbs: 0.5, fat: 9.8 };
const peas = { kcal: 56, protein: 5, carbs: 5.5, fat: 0.6 };
const sweetPotato = { kcal: 86, protein: 1.6, carbs: 20.1, fat: 0.1 };
const rice = { kcal: 350, protein: 7, carbs: 77, fat: 1.1 };
const chicken = { kcal: 108, protein: 23, carbs: 0, fat: 1.8 };

const omelette: PlanItem[] = [
  { key: 'eggs', per100g: eggs, baseGrams: 165 },
  { key: 'tuna', per100g: tuna, baseGrams: 56 },
  { key: 'peas', per100g: peas, baseGrams: 230 },
  { key: 'potato', per100g: sweetPotato, baseGrams: 150 },
];

describe('planQuantities', () => {
  it('returns nothing for no items', () => {
    const plan = planQuantities([], { kcal: 500, protein: 40 });
    expect(plan.grams.size).toBe(0);
    expect(plan.totals.kcal).toBe(0);
    expect(plan.fits).toBe(true);
  });

  it('never goes over the calories left, and reaches the protein when it can', () => {
    const plan = planQuantities(omelette, { kcal: 420, protein: 54, carbs: 36, fat: 1 });
    expect(plan.fits).toBe(true);
    expect(plan.totals.kcal).toBeLessThanOrEqual(420);
    expect(plan.totals.protein).toBeGreaterThanOrEqual(53.75);
  });

  it('keeps locked quantities and moves only the others', () => {
    const items = omelette.map((i) => (i.key === 'tuna' ? { ...i, lockedGrams: 80 } : i));
    const plan = planQuantities(items, { kcal: 420, protein: 54 });
    expect(plan.grams.get('tuna')).toBe(80);
    expect(plan.totals.kcal).toBeLessThanOrEqual(420);
  });

  it('keeps every free quantity a multiple of 5 g, between 0 and twice the recipe', () => {
    const plan = planQuantities(omelette, { kcal: 2000, protein: 200, carbs: 300, fat: 100 });
    for (const item of omelette) {
      const g = plan.grams.get(item.key) ?? -1;
      expect(g % PLAN_STEP_G).toBe(0);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(item.baseGrams * MAX_FACTOR + PLAN_STEP_G);
    }
  });

  it('puts protein before carbs: lean protein grows, starch shrinks', () => {
    const dish: PlanItem[] = [
      { key: 'chicken', per100g: chicken, baseGrams: 100 },
      { key: 'rice', per100g: rice, baseGrams: 100 },
    ];
    const plan = planQuantities(dish, { kcal: 400, protein: 50, carbs: 100 });
    expect(plan.totals.kcal).toBeLessThanOrEqual(400);
    // 50 g is out of reach under 400 kcal: chicken goes to its maximum, rice fills the rest.
    expect(plan.totals.protein).toBeGreaterThanOrEqual(49);
    expect(plan.grams.get('chicken')).toBe(200);
    expect(plan.grams.get('rice') ?? 0).toBeLessThan(100);
  });

  it('fills the rest of the calories toward the carbs goal once protein is met', () => {
    const dish: PlanItem[] = [
      { key: 'chicken', per100g: chicken, baseGrams: 150 },
      { key: 'rice', per100g: rice, baseGrams: 50 },
    ];
    const plan = planQuantities(dish, { kcal: 600, protein: 30, carbs: 60 });
    expect(plan.totals.kcal).toBeLessThanOrEqual(600);
    expect(Math.abs(plan.totals.carbs - 60)).toBeLessThan(5);
  });

  it('with locked items already over the budget, drops the free ones to 0 and says it does not fit', () => {
    const items: PlanItem[] = [
      { key: 'rice', per100g: rice, baseGrams: 100, lockedGrams: 200 },
      { key: 'chicken', per100g: chicken, baseGrams: 150 },
    ];
    const plan = planQuantities(items, { kcal: 300, protein: 40 });
    expect(plan.grams.get('chicken')).toBe(0);
    expect(plan.fits).toBe(false);
  });

  it('with a negative budget (already over), plans nothing free', () => {
    const plan = planQuantities(omelette, { kcal: -50, protein: 10 });
    expect([...plan.grams.values()].every((g) => g === 0)).toBe(true);
    expect(plan.fits).toBe(false);
  });

  it('without other goals, stays close to the recipe when it already fits', () => {
    const plan = planQuantities(omelette, { kcal: 5000 });
    for (const item of omelette) expect(plan.grams.get(item.key)).toBe(Math.round(item.baseGrams / 5) * 5);
  });
});

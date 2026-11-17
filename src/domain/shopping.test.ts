import { describe, expect, it } from 'vitest';
import { centsPerKg, estimateCents, ingredientNeeds, parseEuros, toBuy } from './shopping';

describe('ingredientNeeds', () => {
  const chickenRice = {
    ingredients: [
      { foodId: 1, grams: 170 },
      { foodId: 2, grams: 60 },
    ],
    perDay: 1,
  };
  const oats = {
    ingredients: [
      { foodId: 2, grams: 40 },
      { foodId: 3, grams: 150 },
    ],
    perDay: 2,
  };

  it('multiplies one serving by servings per day and days, summing shared products', () => {
    const needs = ingredientNeeds([chickenRice, oats], 5);
    expect(needs.get(1)).toBe(850);
    expect(needs.get(2)).toBe(60 * 5 + 40 * 2 * 5);
    expect(needs.get(3)).toBe(1500);
  });

  it('divides a recipe that makes several portions', () => {
    const batch = { ingredients: [{ foodId: 1, grams: 600 }], portions: 3, perDay: 1 };
    expect(ingredientNeeds([batch], 3).get(1)).toBe(600);
  });

  it('ignores dishes not eaten, zero days and empty quantities', () => {
    expect(ingredientNeeds([{ ...chickenRice, perDay: 0 }], 5).size).toBe(0);
    expect(ingredientNeeds([chickenRice], 0).size).toBe(0);
    expect(ingredientNeeds([{ ingredients: [{ foodId: 1, grams: 0 }], perDay: 1 }], 5).size).toBe(0);
    expect(ingredientNeeds([], 7).size).toBe(0);
  });
});

describe('toBuy', () => {
  it('is the need minus what is left, never negative, rounded up', () => {
    expect(toBuy(850, 300)).toBe(550);
    expect(toBuy(300, 500)).toBe(0);
    expect(toBuy(300, 300)).toBe(0);
    expect(toBuy(100.2, 0)).toBe(101);
    expect(toBuy(100, Number.NaN)).toBe(100);
    expect(toBuy(100, -20)).toBe(100);
  });
});

describe('prices', () => {
  it('gives the price per kg and estimates from it', () => {
    expect(centsPerKg(695, 600)).toBeCloseTo(1158.33, 1);
    expect(centsPerKg(100, 0)).toBeUndefined();
    expect(estimateCents(550, 1158.33)).toBe(637);
    expect(estimateCents(0, 1000)).toBe(0);
    expect(estimateCents(500, 0)).toBe(0);
  });

  it('parses euro amounts with a comma or a dot', () => {
    expect(parseEuros('2,49')).toBe(249);
    expect(parseEuros('2.4')).toBe(240);
    expect(parseEuros(' 3 € ')).toBe(300);
    expect(parseEuros('0,05')).toBe(5);
    expect(parseEuros('')).toBeUndefined();
    expect(parseEuros('2,499')).toBeUndefined();
    expect(parseEuros('abc')).toBeUndefined();
    expect(parseEuros('-2')).toBeUndefined();
  });
});

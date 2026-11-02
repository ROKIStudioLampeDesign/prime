import { computeMacros, MACRO_KEYS, sumMacros, ZERO_MACROS, type Macros, type Per100g } from './nutrition';

/** An ingredient with its product's values; `per100g` is undefined when the product was deleted. */
export interface ResolvedIngredient {
  grams: number;
  per100g?: Per100g;
}

export function scaleMacros(macros: Macros, factor: number): Macros {
  const out = { ...macros };
  for (const key of MACRO_KEYS) out[key] = macros[key] * factor;
  return out;
}

/** Total macros of the dish. Ingredients whose product was deleted are skipped. */
export function computeMealMacros(ingredients: readonly ResolvedIngredient[]): Macros {
  return sumMacros(ingredients.flatMap((i) => (i.per100g ? [computeMacros(i.per100g, i.grams)] : [])));
}

const isPositive = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n) && n > 0;

/** Macros for one portion. Without a valid portion count, the whole dish is one portion. */
export function macrosPerPortion(total: Macros, portions?: number): Macros {
  return isPositive(portions) ? scaleMacros(total, 1 / portions) : { ...total };
}

/** Macros per 100 g of the finished dish, or undefined when the cooked weight isn't usable. */
export function macrosPer100gCooked(total: Macros, cookedWeight?: number): Macros | undefined {
  return isPositive(cookedWeight) ? scaleMacros(total, 100 / cookedWeight) : undefined;
}

export interface MealSummary {
  /** Macros of the whole dish (known ingredients only). */
  total: Macros;
  /** Sum of the known ingredients' raw weights. */
  rawWeight: number;
  /** Weight of the finished dish: the cooked weight when set, else the raw weight. */
  dishWeight: number;
  /** True when `dishWeight` comes from `cookedWeight`. */
  usesCookedWeight: boolean;
  /** Ingredients whose product no longer exists. */
  missingCount: number;
  /** Number of portions the dish makes (1 when unset). */
  portionCount: number;
  /** Weight of one portion of the finished dish. */
  portionGrams: number;
  perPortion: Macros;
  /** Per 100 g of the finished dish; undefined when the dish weighs nothing (e.g. no ingredients). */
  per100g?: Macros;
}

export function summarizeMeal(meal: {
  ingredients: readonly ResolvedIngredient[];
  cookedWeight?: number;
  portions?: number;
}): MealSummary {
  const known = meal.ingredients.filter((i) => i.per100g);
  const total = computeMealMacros(known);
  const rawWeight = known.reduce((sum, i) => sum + (isPositive(i.grams) ? i.grams : 0), 0);
  const usesCookedWeight = isPositive(meal.cookedWeight);
  const dishWeight = usesCookedWeight ? (meal.cookedWeight as number) : rawWeight;
  const portionCount = isPositive(meal.portions) ? meal.portions : 1;
  return {
    total,
    rawWeight,
    dishWeight,
    usesCookedWeight,
    missingCount: meal.ingredients.length - known.length,
    portionCount,
    portionGrams: dishWeight / portionCount,
    perPortion: macrosPerPortion(total, portionCount),
    per100g: dishWeight > 0 ? scaleMacros(total, 100 / dishWeight) : undefined,
  };
}

/** How much of a dish was eaten: a number of portions, or grams of the finished dish. */
export type Serving = { portions: number } | { grams: number };

/** Grams of finished dish for a serving. Invalid amounts count as 0. */
export function servingGrams(serving: Serving, portionGrams: number): number {
  const grams = 'portions' in serving ? serving.portions * portionGrams : serving.grams;
  return Number.isFinite(grams) && grams > 0 ? grams : 0;
}

/** Macros eaten for a serving of a dish. */
export function mealServingMacros(summary: MealSummary, serving: Serving): Macros {
  if (!summary.per100g) return { ...ZERO_MACROS };
  return computeMacros(summary.per100g, servingGrams(serving, summary.portionGrams));
}

export interface MealInput {
  name: string;
  /** Grams per ingredient, in display order. */
  ingredientGrams: readonly number[];
  portions?: number;
  cookedWeight?: number;
}

export interface MealValidation {
  name?: 'required';
  ingredients?: 'empty';
  /** Indexes of ingredients with a missing, zero or negative quantity. */
  invalidGrams: number[];
  portions?: 'invalid';
  cookedWeight?: 'invalid';
  valid: boolean;
}

const MAX_INGREDIENT_GRAMS = 20000;

export function validateMeal(input: MealInput): MealValidation {
  const result: MealValidation = { invalidGrams: [], valid: false };
  if (input.name.trim() === '') result.name = 'required';
  if (input.ingredientGrams.length === 0) result.ingredients = 'empty';
  input.ingredientGrams.forEach((g, i) => {
    if (!isPositive(g) || g > MAX_INGREDIENT_GRAMS) result.invalidGrams.push(i);
  });
  if (input.portions !== undefined && !isPositive(input.portions)) result.portions = 'invalid';
  if (input.cookedWeight !== undefined && !isPositive(input.cookedWeight)) result.cookedWeight = 'invalid';
  result.valid =
    !result.name &&
    !result.ingredients &&
    result.invalidGrams.length === 0 &&
    !result.portions &&
    !result.cookedWeight;
  return result;
}

/** Moves an item; out-of-range moves return the array unchanged. Never mutates. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const out = [...items];
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [item] = out.splice(from, 1) as [T];
  out.splice(to, 0, item);
  return out;
}

/** Name for a duplicated meal: "Chili" → "Chili (copie)", "Chili (copie)" → "Chili (copie 2)". */
export function duplicateName(name: string, existingNames: readonly string[]): string {
  const base = name.replace(/ \(copie(?: \d+)?\)$/, '');
  const taken = new Set(existingNames);
  let candidate = `${base} (copie)`;
  for (let n = 2; taken.has(candidate); n++) candidate = `${base} (copie ${n})`;
  return candidate;
}

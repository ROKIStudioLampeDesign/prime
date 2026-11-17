import { computeMacros, sumMacros, type Macros, type Per100g } from './nutrition';

/**
 * "Ajuster mes repas": how much of each product to eat in the meals left today, so the day ends
 * under the calorie goal (first), reaching the protein goal (then), as close as possible to the
 * carbs goal, then to the fat goal. Quantities move in steps of `PLAN_STEP_G`.
 */

export const PLAN_STEP_G = 5;
/** A product of a dish may go from nothing up to this many times its quantity in the recipe. */
export const MAX_FACTOR = 2;
/** Upper bound for a product with no quantity of reference (e.g. 0 g in the recipe). */
const DEFAULT_MAX_G = 300;

export interface PlanItem {
  key: string;
  per100g: Per100g;
  /** Quantity of reference (the recipe's, for one portion), the starting point. */
  baseGrams: number;
  /** Fixed quantity (padlock): the planner never changes it. */
  lockedGrams?: number;
}

/** What is left of each goal for the rest of the day (goal − eaten; may be negative). */
export interface PlanBudget {
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface Plan {
  grams: Map<string, number>;
  /** Macros of all planned items together. */
  totals: Macros;
  /** The planned items fit under the calorie budget. */
  fits: boolean;
}

const roundToStep = (grams: number) => Math.max(0, Math.round(grams / PLAN_STEP_G) * PLAN_STEP_G);

function maxGrams(item: PlanItem): number {
  return item.baseGrams > 0 ? roundToStep(item.baseGrams * MAX_FACTOR) : DEFAULT_MAX_G;
}

/**
 * Lexicographic score, lower is better: calories over budget, protein missing, distance to the
 * carbs goal, distance to the fat goal, then how far the dishes moved from their recipes. Each
 * level is rounded so that noise in one never hides a real gain in the next.
 */
function score(totals: Macros, budget: PlanBudget, shape: number): number[] {
  return [
    Math.ceil(Math.max(0, totals.kcal - budget.kcal) - 1e-9),
    budget.protein === undefined ? 0 : Math.round(Math.max(0, budget.protein - totals.protein) * 2),
    budget.carbs === undefined ? 0 : Math.round(Math.abs(budget.carbs - totals.carbs)),
    budget.fat === undefined ? 0 : Math.round(Math.abs(budget.fat - totals.fat)),
    shape,
  ];
}

function better(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x < y - 1e-9) return true;
    if (x > y + 1e-9) return false;
  }
  return false;
}

const SINGLE_MOVES = [5, 25, 100, -5, -25, -100];
const PAIR_MOVES = [5, 25];
const MAX_ROUNDS = 2000;

/**
 * Quantities for every item. Locked items keep their quantity; the others start from their
 * recipe and move (steepest descent on `score`, one product or a swap between two at a time)
 * within [0, MAX_FACTOR × recipe], in steps of 5 g. Deterministic.
 */
export function planQuantities(items: readonly PlanItem[], budget: PlanBudget): Plan {
  const free = items.filter((i) => i.lockedGrams === undefined);
  const fixed = sumMacros(
    items.filter((i) => i.lockedGrams !== undefined).map((i) => computeMacros(i.per100g, i.lockedGrams ?? 0)),
  );
  const limits = free.map(maxGrams);
  const x = free.map((item, i) => Math.min(roundToStep(item.baseGrams), limits[i] ?? 0));

  const evaluate = (grams: readonly number[]) => {
    const totals = sumMacros([fixed, ...free.map((item, i) => computeMacros(item.per100g, grams[i] ?? 0))]);
    const shape = free.reduce(
      (sum, item, i) =>
        sum + Math.abs((grams[i] ?? 0) - item.baseGrams) / Math.max(item.baseGrams, PLAN_STEP_G),
      0,
    );
    return score(totals, budget, shape);
  };
  const inRange = (value: number, i: number) => value >= 0 && value <= (limits[i] ?? 0);

  let current = evaluate(x);
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let best: { grams: number[]; score: number[] } | undefined;
    const consider = (grams: number[]) => {
      const s = evaluate(grams);
      if (better(s, best?.score ?? current)) best = { grams, score: s };
    };
    for (let i = 0; i < x.length; i++) {
      for (const d of SINGLE_MOVES) {
        const v = (x[i] ?? 0) + d;
        if (inRange(v, i)) consider(x.map((g, k) => (k === i ? v : g)));
      }
      for (let j = 0; j < x.length; j++) {
        if (i === j) continue;
        for (const d of PAIR_MOVES) {
          const up = (x[i] ?? 0) + d;
          const down = (x[j] ?? 0) - d;
          if (inRange(up, i) && inRange(down, j)) {
            consider(x.map((g, k) => (k === i ? up : k === j ? down : g)));
          }
        }
      }
    }
    if (!best) break;
    best.grams.forEach((g, i) => (x[i] = g));
    current = best.score;
  }

  const grams = new Map<string, number>();
  for (const item of items) {
    const i = free.indexOf(item);
    grams.set(item.key, item.lockedGrams ?? x[i] ?? 0);
  }
  const totals = sumMacros(items.map((item) => computeMacros(item.per100g, grams.get(item.key) ?? 0)));
  return { grams, totals, fits: totals.kcal <= budget.kcal + 1e-9 };
}

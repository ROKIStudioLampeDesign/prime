/** A day whose meals weren't counted: still under the calorie goal, or over it. */
export type UnloggedStatus = 'under' | 'over';

/** Nutrient values for a quantity of food. Energy in kcal, everything else in grams. */
export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  sugars: number;
  fat: number;
  fiber: number;
}

export type MacroKey = keyof Macros;

export const MACRO_KEYS: readonly MacroKey[] = ['kcal', 'protein', 'carbs', 'sugars', 'fat', 'fiber'];

/** Values per 100 g as printed on a label. Sugars and fiber are often missing; they count as 0. */
export interface Per100g {
  kcal: number;
  protein: number;
  carbs: number;
  sugars?: number;
  fat: number;
  fiber?: number;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const ZERO_MACROS: Readonly<Macros> = { kcal: 0, protein: 0, carbs: 0, sugars: 0, fat: 0, fiber: 0 };

/** Macros for `grams` of a food. Negative or non-finite grams count as 0. Results are not rounded. */
export function computeMacros(per100g: Per100g, grams: number): Macros {
  const factor = Number.isFinite(grams) && grams > 0 ? grams / 100 : 0;
  return {
    kcal: per100g.kcal * factor,
    protein: per100g.protein * factor,
    carbs: per100g.carbs * factor,
    sugars: (per100g.sugars ?? 0) * factor,
    fat: per100g.fat * factor,
    fiber: (per100g.fiber ?? 0) * factor,
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  const total = { ...ZERO_MACROS };
  for (const item of items) {
    for (const key of MACRO_KEYS) total[key] += item[key];
  }
  return total;
}

/** Rounds half away from zero to `decimals`, avoiding float artefacts like 1.005 → 1. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.sign(value) * (Math.round(Math.abs(value) * factor + Number.EPSILON * factor) / factor);
}

/** Display rounding: kcal to an integer, everything else to 0.1 g. */
export function roundMacro(key: MacroKey, value: number): number {
  return roundTo(value, key === 'kcal' ? 0 : 1);
}

export function roundMacros(macros: Macros): Macros {
  const out = { ...macros };
  for (const key of MACRO_KEYS) out[key] = roundMacro(key, macros[key]);
  return out;
}

/** Optional daily goals; a missing value means "no goal" for that nutrient. */
export type Goals = Partial<Macros>;

/**
 * How a goal is read:
 * - `ceiling`: stay just under it: reached from 90 % up to the goal, any excess is bad (kcal)
 * - `target`: aim for it, going over is bad (carbs, fat)
 * - `min`: at least this much, more is fine; very close (95 %) counts (protein, fiber)
 * - `max`: never above (sugars)
 */
export type GoalKind = 'ceiling' | 'target' | 'min' | 'max';

export const GOAL_KINDS: Readonly<Record<MacroKey, GoalKind>> = {
  kcal: 'ceiling',
  protein: 'min',
  carbs: 'target',
  sugars: 'max',
  fat: 'target',
  fiber: 'min',
};

export type GoalStatus = 'under' | 'reached' | 'over';

export interface GoalProgress {
  /** value / goal, unbounded (1.2 = 120 %). 0 when the goal is 0. */
  ratio: number;
  /** goal − value; negative when over. */
  remaining: number;
  status: GoalStatus;
  /** True when the status is a problem for this kind of goal (over a target or a max). */
  bad: boolean;
}

/** Share of the goal from which each kind counts as reached (a `max` is reached at the goal). */
const REACHED_RATIO: Readonly<Record<Exclude<GoalKind, 'max'>, number>> = {
  ceiling: 0.9, // 2070–2300 kcal for 2300: just under
  target: 0.95,
  min: 0.95, // 152 g of protein for 160 is close enough
};

export function goalProgress(value: number, goal: number, kind: GoalKind): GoalProgress {
  const ratio = goal > 0 ? value / goal : 0;
  const remaining = goal - value;
  const over = value > goal;
  let reached: boolean;
  if (kind === 'max') reached = value >= goal;
  else if (goal <= 0)
    reached = kind === 'min' && value >= goal; // nothing to aim for below 0
  else reached = ratio >= REACHED_RATIO[kind];
  let status: GoalStatus;
  if (over && kind !== 'min') status = 'over';
  else if (reached) status = 'reached';
  else status = 'under';
  return { ratio, remaining, status, bad: status === 'over' };
}

/** Energy estimated from macros with Atwater factors: 4 kcal/g protein and carbs, 9 kcal/g fat. */
export function estimateKcal(per100g: Pick<Per100g, 'protein' | 'carbs' | 'fat'>): number {
  return 4 * per100g.protein + 4 * per100g.carbs + 9 * per100g.fat;
}

/**
 * True when the declared kcal is far from the Atwater estimate. Labels legitimately differ a bit
 * (fiber, polyols, alcohol, rounding), so only flag a gap above both 15 % and 20 kcal.
 */
export function hasKcalMismatch(per100g: Per100g): boolean {
  const estimate = estimateKcal(per100g);
  const diff = Math.abs(per100g.kcal - estimate);
  return diff > 20 && diff > 0.15 * Math.max(per100g.kcal, estimate);
}

export type Per100gField = keyof Per100g;
export type FoodValueError = 'required' | 'negative' | 'tooHigh' | 'sugarsExceedCarbs';

/** Raw form values: undefined means the field was left empty. */
export type Per100gInput = Partial<Record<Per100gField, number>>;

const REQUIRED_PER_100G: readonly Per100gField[] = ['kcal', 'protein', 'carbs', 'fat'];
const MAX_PER_100G: Readonly<Record<Per100gField, number>> = {
  kcal: 900, // pure fat is ~900 kcal/100 g
  protein: 100,
  carbs: 100,
  sugars: 100,
  fat: 100,
  fiber: 100,
};

export interface Per100gValidation {
  errors: Partial<Record<Per100gField, FoodValueError>>;
  /** The validated values, present only when there are no errors. */
  value?: Per100g;
  kcalMismatch: boolean;
}

export function validatePer100g(input: Per100gInput): Per100gValidation {
  const errors: Per100gValidation['errors'] = {};
  for (const field of Object.keys(MAX_PER_100G) as Per100gField[]) {
    const v = input[field];
    if (v === undefined) {
      if (REQUIRED_PER_100G.includes(field)) errors[field] = 'required';
    } else if (!Number.isFinite(v) || v < 0) errors[field] = 'negative';
    else if (v > MAX_PER_100G[field]) errors[field] = 'tooHigh';
  }
  if (
    !errors.sugars &&
    !errors.carbs &&
    input.sugars !== undefined &&
    input.carbs !== undefined &&
    input.sugars > input.carbs
  ) {
    errors.sugars = 'sugarsExceedCarbs';
  }

  if (Object.keys(errors).length > 0) return { errors, kcalMismatch: false };

  const value: Per100g = {
    kcal: input.kcal ?? 0,
    protein: input.protein ?? 0,
    carbs: input.carbs ?? 0,
    fat: input.fat ?? 0,
  };
  if (input.sugars !== undefined) value.sugars = input.sugars;
  if (input.fiber !== undefined) value.fiber = input.fiber;
  return { errors, value, kcalMismatch: hasKcalMismatch(value) };
}

export type GoalsInput = Partial<Record<MacroKey, number>>;

export function validateGoals(input: GoalsInput): {
  errors: Partial<Record<MacroKey, 'negative'>>;
  value?: Goals;
} {
  const errors: Partial<Record<MacroKey, 'negative'>> = {};
  const value: Goals = {};
  for (const key of MACRO_KEYS) {
    const v = input[key];
    if (v === undefined) continue;
    if (!Number.isFinite(v) || v < 0) errors[key] = 'negative';
    else value[key] = v;
  }
  return Object.keys(errors).length > 0 ? { errors } : { errors, value };
}

/** A sensible default meal for the current time of day. */
export function defaultSlotForHour(hour: number): MealSlot {
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 18 && hour < 23) return 'dinner';
  return 'snack';
}

/** What a quick entry (no product: a restaurant meal…) is made of. Only calories are required. */
export interface QuickMacrosInput {
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export type QuickMacrosField = keyof QuickMacrosInput;
export const MAX_QUICK_KCAL = 10_000;
export const MAX_QUICK_GRAMS = 1_000;

/**
 * Validates a quick entry. Calories are required (0 to 10 000 kcal); protein, carbs and fat are
 * optional (0 to 1 000 g, missing = 0). Sugars and fiber are unknown, so 0.
 */
export function quickMacros(input: QuickMacrosInput): {
  value?: Macros;
  errors: Partial<Record<QuickMacrosField, 'required' | 'negative' | 'tooHigh'>>;
} {
  const errors: Partial<Record<QuickMacrosField, 'required' | 'negative' | 'tooHigh'>> = {};
  const fields: QuickMacrosField[] = ['kcal', 'protein', 'carbs', 'fat'];
  for (const field of fields) {
    const v = input[field];
    const max = field === 'kcal' ? MAX_QUICK_KCAL : MAX_QUICK_GRAMS;
    if (v === undefined) {
      if (field === 'kcal') errors[field] = 'required';
    } else if (!Number.isFinite(v) || v < 0) errors[field] = 'negative';
    else if (v > max) errors[field] = 'tooHigh';
  }
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      kcal: input.kcal ?? 0,
      protein: input.protein ?? 0,
      carbs: input.carbs ?? 0,
      sugars: 0,
      fat: input.fat ?? 0,
      fiber: 0,
    },
  };
}

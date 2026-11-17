/**
 * Shopping (Alimentation › Courses): how much of each product the planned dishes need for a
 * number of days, what to buy given what is left at home, and what it costs.
 */

export interface PlannedDish {
  ingredients: readonly { foodId: number; grams: number }[];
  /** Portions the recipe makes (1 when unset): one serving is the recipe divided by it. */
  portions?: number;
  /** Servings eaten per day. */
  perDay: number;
}

/** Grams of each product needed: one serving × servings per day × days, summed over the dishes. */
export function ingredientNeeds(dishes: readonly PlannedDish[], days: number): Map<number, number> {
  const needs = new Map<number, number>();
  const safeDays = Number.isFinite(days) && days > 0 ? days : 0;
  for (const dish of dishes) {
    const portions = dish.portions !== undefined && dish.portions > 0 ? dish.portions : 1;
    const servings = Number.isFinite(dish.perDay) && dish.perDay > 0 ? dish.perDay * safeDays : 0;
    if (servings === 0) continue;
    for (const { foodId, grams } of dish.ingredients) {
      if (!(grams > 0)) continue;
      needs.set(foodId, (needs.get(foodId) ?? 0) + (grams / portions) * servings);
    }
  }
  return needs;
}

/** What to buy: the need minus what is left at home, rounded up to the gram, never below 0. */
export function toBuy(neededG: number, leftG: number): number {
  const missing = neededG - (Number.isFinite(leftG) && leftG > 0 ? leftG : 0);
  return missing > 0 ? Math.ceil(missing - 1e-9) : 0;
}

/** Price per kg (cents) of `grams` bought for `cents`; undefined without a quantity. */
export function centsPerKg(cents: number, grams: number): number | undefined {
  return grams > 0 && cents >= 0 ? (cents * 1000) / grams : undefined;
}

/** Estimated cost (cents) of `grams` at a known price per kg. */
export function estimateCents(grams: number, perKg: number): number {
  return grams > 0 && perKg > 0 ? Math.round((grams * perKg) / 1000) : 0;
}

/** Euro amount typed by the user ("2,49", "2.49", "3") → cents; undefined if not a valid amount. */
export function parseEuros(text: string): number | undefined {
  const normalized = text.trim().replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return undefined;
  return Math.round(Number(normalized) * 100);
}

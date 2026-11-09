/** Olympic bar loading, for the bench goal gauge. */

/** Men's Olympic bar. */
export const BAR_KG = 20;

/**
 * Calibrated competition (powerlifting) plates, heaviest first. No 25 kg nor 15 kg plate: the
 * bar is always loaded with 20, 10, 5, 2.5 and 1.25 kg plates.
 */
export const PLATE_KGS = [20, 10, 5, 2.5, 1.25] as const;
export type PlateKg = (typeof PLATE_KGS)[number];

/**
 * Plates for one side of the bar, heaviest first (greedy, like loading at the gym). Whatever is
 * below the smallest plate (1.25 kg) can't be loaded and is dropped. Computed in grams so 2.5 and
 * 1.25 never drift.
 */
export function platesFor(sideKg: number): PlateKg[] {
  let left = Math.round(Math.max(0, Number.isFinite(sideKg) ? sideKg : 0) * 1000);
  const plates: PlateKg[] = [];
  for (const kg of PLATE_KGS) {
    const g = kg * 1000;
    while (left >= g) {
      plates.push(kg);
      left -= g;
    }
  }
  return plates;
}

/** Plates per side for a total load on the bar (a load lighter than the bar shows the bare bar). */
export function barLoading(totalKg: number): PlateKg[] {
  return platesFor((Math.max(totalKg, BAR_KG) - BAR_KG) / 2);
}

/** Plates grouped by weight, heaviest first, for a "2 × 20 kg" legend. */
export function plateCounts(plates: readonly PlateKg[]): { kg: PlateKg; count: number }[] {
  return PLATE_KGS.map((kg) => ({ kg, count: plates.filter((p) => p === kg).length })).filter(
    (c) => c.count > 0,
  );
}

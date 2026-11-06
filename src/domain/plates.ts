/** Olympic bar loading, for the bench goal gauge. */

/** Men's Olympic bar. */
export const BAR_KG = 20;

/** Standard plates, heaviest first. */
export const PLATE_KGS = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
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

export interface BarbellLoad {
  /** Plates per side for the best lift (a lift lighter than the bar shows the bare bar). */
  current: PlateKg[];
  /** Plates per side still to add to reach the goal (empty once reached). */
  missing: PlateKg[];
}

/** The best lift loaded on a bar, and what each side still needs for the goal. */
export function barbellLoad(bestKg: number, goalKg: number): BarbellLoad {
  const loaded = Math.max(bestKg, BAR_KG);
  return {
    current: platesFor((loaded - BAR_KG) / 2),
    missing: goalKg > loaded ? platesFor((goalKg - loaded) / 2) : [],
  };
}

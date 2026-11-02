import type { Per100gField, Per100gInput } from './nutrition';

/** Fields requested from the Open Food Facts API (keep the payload small). */
export const OFF_FIELDS = 'product_name,brands,image_front_url,nutriments';

const NUTRIENT_KEYS: Readonly<Record<Exclude<Per100gField, 'kcal'>, string>> = {
  protein: 'proteins_100g',
  carbs: 'carbohydrates_100g',
  sugars: 'sugars_100g',
  fat: 'fat_100g',
  fiber: 'fiber_100g',
};

const KJ_PER_KCAL = 4.184;

export interface OffProductDraft {
  name?: string;
  brand?: string;
  imageUrl?: string;
  /** Values found, per 100 g. */
  per100g: Per100gInput;
  /** Fields the product page doesn't provide: left empty in the form and flagged for review. */
  missing: Per100gField[];
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Maps an Open Food Facts v2 product response to a product draft, or undefined when the product
 * isn't found. Energy falls back from kcal to kJ / 4.184 (some products only declare kJ).
 * Only the first brand is kept ("Ferrero, Nutella" → "Ferrero").
 */
export function mapOffProduct(response: unknown): OffProductDraft | undefined {
  if (typeof response !== 'object' || response === null) return undefined;
  const { status, product } = response as { status?: unknown; product?: unknown };
  if (status !== 1 || typeof product !== 'object' || product === null) return undefined;
  const p = product as Record<string, unknown>;
  const nutriments = (
    typeof p.nutriments === 'object' && p.nutriments !== null ? p.nutriments : {}
  ) as Record<string, unknown>;

  const per100g: Per100gInput = {};
  const missing: Per100gField[] = [];

  const kcal =
    toNumber(nutriments['energy-kcal_100g']) ??
    (() => {
      const kj = toNumber(nutriments['energy-kj_100g']) ?? toNumber(nutriments.energy_100g);
      return kj === undefined ? undefined : kj / KJ_PER_KCAL;
    })();
  if (kcal === undefined) missing.push('kcal');
  else per100g.kcal = Math.round(kcal);

  for (const [field, key] of Object.entries(NUTRIENT_KEYS) as [Per100gField, string][]) {
    const value = toNumber(nutriments[key]);
    if (value === undefined) missing.push(field);
    else per100g[field] = round1(value);
  }

  return {
    name: text(p.product_name),
    brand: text(p.brands)?.split(',')[0]?.trim(),
    imageUrl: text(p.image_front_url),
    per100g,
    missing,
  };
}

import { describe, expect, it } from 'vitest';
import { mapOffProduct } from './openFoodFacts';

const nutella = {
  code: '3017620422003',
  status: 1,
  product: {
    product_name: 'Nutella',
    brands: 'Ferrero, Nutella',
    image_front_url: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.jpg',
    nutriments: {
      'energy-kcal_100g': 539,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      sugars_100g: 56.3,
      fat_100g: 30.9,
      fiber_100g: 0,
    },
  },
};

describe('mapOffProduct', () => {
  it('maps name, first brand, image and per-100 g values', () => {
    expect(mapOffProduct(nutella)).toEqual({
      name: 'Nutella',
      brand: 'Ferrero',
      imageUrl: nutella.product.image_front_url,
      per100g: { kcal: 539, protein: 6.3, carbs: 57.5, sugars: 56.3, fat: 30.9, fiber: 0 },
      missing: [],
    });
  });

  it('flags missing nutrients instead of inventing zeros', () => {
    const draft = mapOffProduct({
      status: 1,
      product: { product_name: 'Pain', nutriments: { 'energy-kcal_100g': 250, proteins_100g: 9 } },
    });
    expect(draft?.per100g).toEqual({ kcal: 250, protein: 9 });
    expect(draft?.missing).toEqual(['carbs', 'sugars', 'fat', 'fiber']);
    expect(draft?.brand).toBeUndefined();
    expect(draft?.imageUrl).toBeUndefined();
  });

  it('converts kJ when kcal is absent, and parses numeric strings', () => {
    const draft = mapOffProduct({
      status: 1,
      product: { nutriments: { 'energy-kj_100g': '1046', fat_100g: '3,25', proteins_100g: -1 } },
    });
    expect(draft?.per100g.kcal).toBe(250);
    expect(draft?.per100g.fat).toBe(3.3);
    expect(draft?.missing).toContain('protein'); // negative values are ignored
    expect(draft?.name).toBeUndefined();
  });

  it('handles products without nutriments', () => {
    expect(mapOffProduct({ status: 1, product: { product_name: ' Eau ' } })).toMatchObject({
      name: 'Eau',
      per100g: {},
      missing: ['kcal', 'protein', 'carbs', 'sugars', 'fat', 'fiber'],
    });
  });

  it('returns undefined when not found or malformed', () => {
    expect(mapOffProduct({ status: 0, status_verbose: 'product not found' })).toBeUndefined();
    expect(mapOffProduct(null)).toBeUndefined();
    expect(mapOffProduct('nope')).toBeUndefined();
    expect(mapOffProduct({ status: 1 })).toBeUndefined();
  });
});

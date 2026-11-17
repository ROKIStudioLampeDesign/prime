import { normalizeText } from '../domain/search';
import { centsPerKg } from '../domain/shopping';
import { db, type PrimeDB, type ShoppingItem } from './db';

/** The shopping list, in the order things were added. */
export async function listShoppingItems(database: PrimeDB = db): Promise<ShoppingItem[]> {
  return database.shoppingItems.orderBy('createdAt').toArray();
}

/** Key of the price remembered for an item: its product, else its name. */
export function priceKey(item: Pick<ShoppingItem, 'name' | 'foodId'>): string {
  return item.foodId !== undefined ? `food:${item.foodId}` : `name:${normalizeText(item.name)}`;
}

/** Last price per kg paid for each product or hand-typed name. */
export async function getShoppingPrices(database: PrimeDB = db): Promise<Map<string, number>> {
  const prices = await database.shoppingPrices.toArray();
  return new Map(prices.map((p) => [p.key, p.centsPerKg]));
}

export interface ShoppingInput {
  name: string;
  foodId?: number;
  neededG?: number;
}

/**
 * Adds a line, or adds its quantity to a line not yet taken for the same product (or, for a
 * hand-typed ingredient, the same name).
 */
export async function addShoppingItem(input: ShoppingInput, database: PrimeDB = db, now = Date.now()) {
  const name = input.name.trim();
  if (!name) throw new Error('A shopping item needs a name');
  await database.transaction('rw', database.shoppingItems, async () => {
    const key = priceKey({ name, foodId: input.foodId });
    const same = (await database.shoppingItems.toArray()).find((i) => !i.checked && priceKey(i) === key);
    const grams = input.neededG !== undefined && input.neededG > 0 ? input.neededG : undefined;
    if (same) {
      if (grams !== undefined)
        await database.shoppingItems.update(same.id, { neededG: (same.neededG ?? 0) + grams });
      return;
    }
    await database.shoppingItems.add({
      name,
      ...(input.foodId !== undefined && { foodId: input.foodId }),
      ...(grams !== undefined && { neededG: grams }),
      checked: false,
      createdAt: now,
    });
  });
}

export async function updateShoppingItem(
  id: number,
  changes: Partial<Pick<ShoppingItem, 'name' | 'neededG' | 'boughtG' | 'priceCents' | 'checked'>>,
  database: PrimeDB = db,
): Promise<void> {
  await database.shoppingItems.update(id, changes);
}

export async function deleteShoppingItem(id: number, database: PrimeDB = db): Promise<void> {
  await database.shoppingItems.delete(id);
}

/**
 * Ends a shopping trip: the price per kg of everything taken with a quantity and a price is
 * remembered, then the lines taken leave the list. Lines not taken stay for next time.
 */
export async function finishShopping(database: PrimeDB = db, now = Date.now()): Promise<void> {
  await database.transaction('rw', [database.shoppingItems, database.shoppingPrices], async () => {
    const taken = (await database.shoppingItems.toArray()).filter((i) => i.checked);
    for (const item of taken) {
      const perKg =
        item.priceCents !== undefined ? centsPerKg(item.priceCents, item.boughtG ?? 0) : undefined;
      if (perKg !== undefined)
        await database.shoppingPrices.put({ key: priceKey(item), centsPerKg: perKg, updatedAt: now });
    }
    await database.shoppingItems.bulkDelete(taken.map((i) => i.id));
  });
}

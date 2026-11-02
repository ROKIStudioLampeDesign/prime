import type { Per100g } from '../domain/nutrition';
import { normalizeText } from '../domain/search';
import { db, type Food, type PrimeDB } from './db';

export interface FoodInput {
  name: string;
  brand?: string;
  barcode?: string;
  photo?: Blob;
  per100g: Per100g;
  favorite?: boolean;
}

function toRecord(input: FoodInput) {
  const name = input.name.trim();
  const brand = input.brand?.trim() || undefined;
  return {
    name,
    brand,
    barcode: input.barcode?.trim() || undefined,
    photo: input.photo,
    per100g: input.per100g,
    nameNormalized: normalizeText(`${name} ${brand ?? ''}`),
  };
}

export function listFoods(database: PrimeDB = db): Promise<Food[]> {
  return database.foods.toArray();
}

export function getFood(id: number, database: PrimeDB = db): Promise<Food | undefined> {
  return database.foods.get(id);
}

export async function createFood(input: FoodInput, database: PrimeDB = db): Promise<number> {
  const now = Date.now();
  return database.foods.add({
    ...toRecord(input),
    favorite: input.favorite ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  });
}

/** Updates a food. Existing log entries are untouched: they carry their own snapshot. */
export async function updateFood(id: number, input: FoodInput, database: PrimeDB = db): Promise<void> {
  // Dexie's update deletes properties set to `undefined`, which clears a removed brand/photo.
  await database.foods.update(id, {
    ...toRecord(input),
    ...(input.favorite !== undefined && { favorite: input.favorite ? 1 : 0 }),
    updatedAt: Date.now(),
  });
}

export async function setFavorite(id: number, favorite: boolean, database: PrimeDB = db): Promise<void> {
  await database.foods.update(id, { favorite: favorite ? 1 : 0 });
}

/** Deletes a food. Its log entries stay, displayed from their snapshot. */
export async function deleteFood(id: number, database: PrimeDB = db): Promise<void> {
  await database.foods.delete(id);
}

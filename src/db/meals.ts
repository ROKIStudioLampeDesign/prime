import { duplicateName, summarizeMeal, type MealSummary } from '../domain/meal';
import { normalizeText } from '../domain/search';
import { db, type Food, type Meal, type MealIngredient, type PrimeDB } from './db';

export interface MealInput {
  name: string;
  photo?: Blob;
  ingredients: MealIngredient[];
  cookedWeight?: number;
  portions?: number;
  favorite?: boolean;
}

function toRecord(input: MealInput) {
  const name = input.name.trim();
  return {
    name,
    nameNormalized: normalizeText(name),
    photo: input.photo,
    ingredients: input.ingredients.map(({ foodId, grams }) => ({ foodId, grams })),
    cookedWeight: input.cookedWeight,
    portions: input.portions,
  };
}

export function listMeals(database: PrimeDB = db): Promise<Meal[]> {
  return database.meals.toArray();
}

export function getMeal(id: number, database: PrimeDB = db): Promise<Meal | undefined> {
  return database.meals.get(id);
}

export async function createMeal(input: MealInput, database: PrimeDB = db): Promise<number> {
  const now = Date.now();
  return database.meals.add({
    ...toRecord(input),
    favorite: input.favorite ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  });
}

/** Updates a meal. Existing log entries are untouched: they carry their own snapshot. */
export async function updateMeal(id: number, input: MealInput, database: PrimeDB = db): Promise<void> {
  // Dexie's update deletes properties set to `undefined` (removed photo, cleared portions…).
  await database.meals.update(id, {
    ...toRecord(input),
    ...(input.favorite !== undefined && { favorite: input.favorite ? 1 : 0 }),
    updatedAt: Date.now(),
  });
}

export async function setMealFavorite(id: number, favorite: boolean, database: PrimeDB = db): Promise<void> {
  await database.meals.update(id, { favorite: favorite ? 1 : 0 });
}

/** Deletes a meal. Its log entries stay, displayed from their snapshot. */
export async function deleteMeal(id: number, database: PrimeDB = db): Promise<void> {
  await database.meals.delete(id);
}

/** Copies a meal (ingredients, photo, weights) under a new unused name. Returns the new id. */
export async function duplicateMeal(id: number, database: PrimeDB = db): Promise<number> {
  return database.transaction('rw', database.meals, async () => {
    const meal = await database.meals.get(id);
    if (!meal) throw new Error(`Meal ${id} not found`);
    const names = (await database.meals.toArray()).map((m) => m.name);
    return createMeal(
      {
        name: duplicateName(meal.name, names),
        photo: meal.photo,
        ingredients: meal.ingredients,
        cookedWeight: meal.cookedWeight,
        portions: meal.portions,
      },
      database,
    );
  });
}

/** Summarizes a meal against the current products; deleted products count as missing. */
export function summarizeWithFoods(
  meal: Pick<Meal, 'ingredients' | 'cookedWeight' | 'portions'>,
  foodsById: ReadonlyMap<number, Pick<Food, 'per100g'>>,
): MealSummary {
  return summarizeMeal({
    ingredients: meal.ingredients.map((i) => ({ grams: i.grams, per100g: foodsById.get(i.foodId)?.per100g })),
    cookedWeight: meal.cookedWeight,
    portions: meal.portions,
  });
}

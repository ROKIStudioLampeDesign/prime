import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Food, Meal } from '../../db/db';
import { listFoods } from '../../db/foods';
import { itemKey, listRecentItems, type RecentItem } from '../../db/logEntries';
import { listMeals, summarizeWithFoods } from '../../db/meals';
import type { MealSummary, Serving } from '../../domain/meal';
import { ZERO_MACROS } from '../../domain/nutrition';
import { formatGrams, formatMacro } from '../../lib/format';
import type { PortionTarget } from './PortionSheet';

interface ItemBase {
  /** Unique across kinds: "food:3" / "meal:3". */
  key: string;
  id: number;
  name: string;
  brand?: string;
  favorite: boolean;
  photo?: Blob;
  recent?: RecentItem;
}

export type PickerItem =
  (ItemBase & { kind: 'food'; food: Food }) | (ItemBase & { kind: 'meal'; meal: Meal; summary: MealSummary });

export interface PickerData {
  items: PickerItem[];
  recentKeys: string[];
  foodsById: Map<number, Food>;
}

/** Foods (and optionally meals) with their recent usage, for pickers. Undefined while loading. */
export function usePickerItems(includeMeals: boolean): PickerData | undefined {
  const foods = useLiveQuery(listFoods);
  const meals = useLiveQuery(() => (includeMeals ? listMeals() : Promise.resolve([])), [includeMeals]);
  const recents = useLiveQuery(() => listRecentItems());

  return useMemo(() => {
    if (!foods || !meals || !recents) return undefined;
    const recentByKey = new Map(recents.map((r) => [itemKey(r.kind, r.id), r]));
    const foodsById = new Map(foods.map((f) => [f.id, f]));
    const items: PickerItem[] = [
      ...foods.map((food) => {
        const key = itemKey('food', food.id);
        return {
          kind: 'food' as const,
          key,
          id: food.id,
          name: food.name,
          brand: food.brand,
          favorite: food.favorite === 1,
          photo: food.photo,
          recent: recentByKey.get(key),
          food,
        };
      }),
      ...meals.map((meal) => {
        const key = itemKey('meal', meal.id);
        return {
          kind: 'meal' as const,
          key,
          id: meal.id,
          name: meal.name,
          favorite: meal.favorite === 1,
          photo: meal.photo,
          recent: recentByKey.get(key),
          meal,
          summary: summarizeWithFoods(meal, foodsById),
        };
      }),
    ];
    return { items, recentKeys: [...recentByKey.keys()], foodsById };
  }, [foods, meals, recents]);
}

export function portionsLabel(count: number): string {
  // French: "1,5 portion" is singular, plural starts at 2.
  return `${formatGrams(count)} portion${count >= 2 ? 's' : ''}`;
}

export function missingIngredientsWarning(count: number): string {
  return count === 1
    ? '1 ingrédient (produit supprimé) n’est pas compté.'
    : `${count} ingrédients (produits supprimés) ne sont pas comptés.`;
}

/** What the portion sheet needs to log a meal. */
export function mealTarget(meal: Pick<Meal, 'name'>, summary: MealSummary): PortionTarget {
  return {
    name: meal.name,
    subtitle: `Plat · ${portionsLabel(summary.portionCount)} · ${formatMacro('kcal', summary.perPortion.kcal)} kcal / portion`,
    per100g: summary.per100g ?? ZERO_MACROS,
    portionGrams: summary.portionGrams,
    warning: summary.missingCount > 0 ? missingIngredientsWarning(summary.missingCount) : undefined,
    disabledReason: summary.per100g ? undefined : 'Ce plat n’a aucun ingrédient utilisable.',
  };
}

/** Default quantity: the last one used, else 1 portion for meals and 100 g for foods. */
export function initialServing(item: PickerItem): Serving {
  const recent = item.recent;
  if (recent?.kind === 'meal' && recent.lastPortions !== undefined) return { portions: recent.lastPortions };
  if (recent) return { grams: recent.lastGrams };
  return item.kind === 'meal' ? { portions: 1 } : { grams: 100 };
}

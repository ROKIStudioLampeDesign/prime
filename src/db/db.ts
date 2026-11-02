import Dexie, { type EntityTable } from 'dexie';
import type { LocalDate } from '../domain/date';
import type { Goals, Macros, MealSlot, Per100g } from '../domain/nutrition';

/** Key/value store for app-level settings and flags (e.g. persistence requested). */
export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface Food {
  id: number;
  name: string;
  /** `normalizeText(name + brand)`, kept in sync by `saveFood`, used for search. */
  nameNormalized: string;
  brand?: string;
  barcode?: string;
  /** JPEG, max 800 px on the longest side. */
  photo?: Blob;
  per100g: Per100g;
  /** 0 | 1 (IndexedDB cannot index booleans). */
  favorite: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

export interface GoalsRecord extends Goals {
  id: 'default';
  updatedAt: number;
}

export interface MealIngredient {
  /** The product; it may have been deleted since (shown as "produit supprimé"). */
  foodId: number;
  grams: number;
}

/** A saved recipe. Its macros are always derived from the ingredients, never stored. */
export interface Meal {
  id: number;
  name: string;
  nameNormalized: string;
  /** JPEG, max 800 px on the longest side. */
  photo?: Blob;
  /** In display order. */
  ingredients: MealIngredient[];
  /** Weight of the finished dish in grams; the raw ingredient weight is used when unset. */
  cookedWeight?: number;
  /** Number of portions the dish makes; one portion = the whole dish when unset. */
  portions?: number;
  favorite: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

interface LogEntryBase {
  id: number;
  date: LocalDate;
  slot: MealSlot;
  /** Grams eaten (of the food, or of the finished dish). */
  grams: number;
  /** Name of the food or meal at log time. */
  name: string;
  /** Per 100 g of the food, or of the finished dish, at log time. */
  per100g: Per100g;
  /** Unrounded `computeMacros(per100g, grams)`; round only for display. */
  macros: Macros;
  createdAt: number;
  updatedAt: number;
}

export interface FoodLogEntry extends LogEntryBase {
  kind: 'food';
  /** Source food, kept for "recents"; it may no longer exist. */
  foodId: number;
  brand?: string;
}

export interface MealLogEntry extends LogEntryBase {
  kind: 'meal';
  /** Source meal, kept for "recents"; it may no longer exist. */
  mealId: number;
  /** Weight of one portion of the dish at log time. */
  portionGrams: number;
  /** Set when logged by portions (then grams = portions × portionGrams); unset when logged by grams. */
  portions?: number;
}

/**
 * Something eaten on a day. Everything needed to display and edit it is snapshotted at log time,
 * so later edits to (or deletion of) the food, meal or ingredients never rewrite history.
 */
export type LogEntry = FoodLogEntry | MealLogEntry;

export class PrimeDB extends Dexie {
  settings!: EntityTable<Setting, 'key'>;
  foods!: EntityTable<Food, 'id'>;
  meals!: EntityTable<Meal, 'id'>;
  goals!: EntityTable<GoalsRecord, 'id'>;
  logEntries!: EntityTable<LogEntry, 'id'>;

  constructor(name = 'prime') {
    super(name);

    // Schema history. NEVER edit a published version: add a new `this.version(n + 1)` with
    // the full store list and, if data must change, an `.upgrade(tx => ...)` migration.
    this.version(1).stores({
      settings: 'key',
    });

    // v2: nutrition (purely additive, no data migration needed).
    this.version(2).stores({
      settings: 'key',
      foods: '++id, nameNormalized, barcode, createdAt',
      goals: 'id',
      logEntries: '++id, date, foodId, createdAt',
    });

    // v3: saved meals; log entries gain `kind` and generic `name`/`brand` snapshot fields.
    this.version(3)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
      })
      .upgrade((tx) =>
        tx
          .table('logEntries')
          .toCollection()
          .modify((entry: Record<string, unknown>) => {
            entry.kind = 'food';
            entry.name = entry.foodName;
            if (entry.foodBrand !== undefined) entry.brand = entry.foodBrand;
            delete entry.foodName;
            delete entry.foodBrand;
          }),
      );
  }
}

export const db = new PrimeDB();

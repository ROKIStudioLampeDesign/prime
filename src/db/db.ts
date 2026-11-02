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

/**
 * One food eaten on a day. Everything needed to display and edit it is snapshotted at log time,
 * so later edits to (or deletion of) the food never rewrite history.
 */
export interface LogEntry {
  id: number;
  date: LocalDate;
  slot: MealSlot;
  /** Source food, kept for "recents"; it may no longer exist. */
  foodId: number;
  grams: number;
  foodName: string;
  foodBrand?: string;
  per100g: Per100g;
  /** Unrounded `computeMacros(per100g, grams)`; round only for display. */
  macros: Macros;
  createdAt: number;
  updatedAt: number;
}

export class PrimeDB extends Dexie {
  settings!: EntityTable<Setting, 'key'>;
  foods!: EntityTable<Food, 'id'>;
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
  }
}

export const db = new PrimeDB();

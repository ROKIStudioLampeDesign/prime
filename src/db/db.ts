import Dexie, { type EntityTable } from 'dexie';

/** Key/value store for app-level settings and flags (e.g. persistence requested, user goals). */
export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export class PrimeDB extends Dexie {
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'prime') {
    super(name);

    // Schema history. NEVER edit a published version: add a new `this.version(n + 1)` with
    // the full store list and, if data must change, an `.upgrade(tx => ...)` migration.
    this.version(1).stores({
      settings: 'key',
    });
  }
}

export const db = new PrimeDB();

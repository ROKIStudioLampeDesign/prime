import { MAX_TIMESTAMP_MS, validateBackupRows } from './backupRows';
import { normalizeText } from './search';

/** Identifies Prime backup files. */
export const BACKUP_APP = 'prime';
/** Version of the file envelope (not of the database schema). */
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  formatVersion: number;
  /** Dexie schema version of the database the rows come from. */
  schemaVersion: number;
  /** Epoch ms. */
  exportedAt: number;
  /** Rows per table; binary values are encoded (see db/backup.ts). */
  tables: Record<string, unknown[]>;
}

export type BackupError =
  'notJson' | 'notPrime' | 'unsupportedFormat' | 'newerSchema' | 'olderSchema' | 'malformed' | 'invalidRows';

export type ParseBackupResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: Exclude<BackupError, 'invalidRows'> }
  /** A row that doesn't match its table's shape: `index` is 0-based within `table`. */
  | { ok: false; error: 'invalidRows'; table: string; index: number };

/**
 * Migrations from an older schema version to the next one, applied in order on import.
 * When a Dexie version changes stored data, add the matching transform here (keyed by the version
 * it upgrades FROM) so older backups stay importable, and update the row schemas in
 * backupRows.ts (rows are validated after these transforms, against the current schema).
 */
export const BACKUP_MIGRATIONS: Readonly<
  Record<number, (tables: Record<string, unknown[]>) => Record<string, unknown[]>>
> = {
  // v5 → v6: the built-in barbell bench press is now called "Bench" (frozen here on purpose:
  // a later rename gets its own transform).
  5: (tables) => renameBuiltIns(tables, new Map([['bench-press', 'Bench']])),
};

/** Renames built-in exercise rows (matched by seedId); other rows and tables are left as they are. */
function renameBuiltIns(
  tables: Record<string, unknown[]>,
  names: ReadonlyMap<string, string>,
): Record<string, unknown[]> {
  const exercises = tables.exercises;
  if (!Array.isArray(exercises)) return tables;
  return {
    ...tables,
    exercises: exercises.map((row) => {
      if (typeof row !== 'object' || row === null) return row;
      const seedId: unknown = (row as { seedId?: unknown }).seedId;
      const name = typeof seedId === 'string' ? names.get(seedId) : undefined;
      return name === undefined ? row : { ...row, name, nameNormalized: normalizeText(name) };
    }),
  };
}

/** Oldest schema version a backup can come from (backups exist since schema v5). */
export const MIN_BACKUP_SCHEMA = 5;

export function parseBackup(text: string, currentSchema: number): ParseBackupResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  if (typeof data !== 'object' || data === null || (data as { app?: unknown }).app !== BACKUP_APP) {
    return { ok: false, error: 'notPrime' };
  }
  const b = data as Partial<BackupFile>;
  if (b.formatVersion !== BACKUP_FORMAT_VERSION) return { ok: false, error: 'unsupportedFormat' };
  if (
    typeof b.schemaVersion !== 'number' ||
    typeof b.exportedAt !== 'number' ||
    !Number.isFinite(b.exportedAt) ||
    Math.abs(b.exportedAt) > MAX_TIMESTAMP_MS // formatting it for the preview would throw
  )
    return { ok: false, error: 'malformed' };
  if (b.schemaVersion > currentSchema) return { ok: false, error: 'newerSchema' };
  if (b.schemaVersion < MIN_BACKUP_SCHEMA) return { ok: false, error: 'olderSchema' };
  if (
    typeof b.tables !== 'object' ||
    b.tables === null ||
    Object.values(b.tables).some(
      (rows) => !Array.isArray(rows) || rows.some((r) => typeof r !== 'object' || r === null),
    )
  ) {
    return { ok: false, error: 'malformed' };
  }

  let tables = b.tables as Record<string, unknown[]>;
  for (let v = b.schemaVersion; v < currentSchema; v++) {
    const migrate = BACKUP_MIGRATIONS[v];
    if (migrate) tables = migrate(tables);
  }
  // Validated after migrations, against the current schema.
  const rows = validateBackupRows(tables);
  if (!rows.ok) return { ok: false, error: 'invalidRows', table: rows.table, index: rows.index };
  return { ok: true, backup: { ...(b as BackupFile), tables, schemaVersion: currentSchema } };
}

/** Number of rows per table, for the import preview. */
export function backupCounts(backup: BackupFile): Record<string, number> {
  return Object.fromEntries(Object.entries(backup.tables).map(([t, rows]) => [t, rows.length]));
}

export const BACKUP_REMINDER_DAYS = 14;
const DAY_MS = 86_400_000;

/** Whole days since the last export, or undefined if never exported. */
export function daysSinceBackup(lastExportAt: number | undefined, now: number): number | undefined {
  return lastExportAt === undefined ? undefined : Math.max(0, Math.floor((now - lastExportAt) / DAY_MS));
}

/**
 * Whether to show the backup reminder: 14 days since the last export, or since the first launch
 * when there was never one, and only if the user has data worth saving and hasn't snoozed it.
 */
export function backupReminderDue(input: {
  lastExportAt?: number;
  firstLaunchAt?: number;
  snoozedUntil?: number;
  hasData: boolean;
  now: number;
}): boolean {
  if (!input.hasData) return false;
  if (input.snoozedUntil !== undefined && input.now < input.snoozedUntil) return false;
  const since = input.lastExportAt ?? input.firstLaunchAt;
  if (since === undefined) return false;
  return input.now - since >= BACKUP_REMINDER_DAYS * DAY_MS;
}

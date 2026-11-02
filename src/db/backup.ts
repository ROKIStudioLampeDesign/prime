import {
  BACKUP_APP,
  BACKUP_FORMAT_VERSION,
  parseBackup,
  type BackupError,
  type BackupFile,
} from '../domain/backup';
import { db, type PrimeDB } from './db';
import { getSetting, setSetting } from './settings';

/** Settings that describe this device rather than the user's data: never imported or replaced. */
const DEVICE_SETTINGS = new Set([
  'storagePersisted',
  'lastExportAt',
  'firstLaunchAt',
  'backupReminderSnoozedUntil',
]);

interface EncodedBlob {
  __blob: { type: string; base64: string };
}

function isEncodedBlob(value: unknown): value is EncodedBlob {
  return typeof value === 'object' && value !== null && '__blob' in value;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK)
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Deep-copies a row, turning Blobs (photos) into base64 objects. */
async function encode(value: unknown): Promise<unknown> {
  if (value instanceof Blob) return { __blob: { type: value.type, base64: await blobToBase64(value) } };
  if (Array.isArray(value)) return Promise.all(value.map(encode));
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await encode(v);
    return out;
  }
  return value;
}

function decode(value: unknown): unknown {
  if (isEncodedBlob(value)) return base64ToBlob(value.__blob.base64, value.__blob.type);
  if (Array.isArray(value)) return value.map(decode);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  }
  return value;
}

/** Every table of the database, photos included, as a versioned backup object. */
export async function exportBackup(database: PrimeDB = db, now = Date.now()): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  for (const table of database.tables) {
    const rows = await table.toArray();
    const kept = table.name === 'settings' ? rows.filter((r) => !DEVICE_SETTINGS.has(r.key)) : rows;
    tables[table.name] = (await encode(kept)) as unknown[];
  }
  return {
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: database.verno,
    exportedAt: now,
    tables,
  };
}

/** File name like "prime-sauvegarde-2026-11-02.json". */
export function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `prime-sauvegarde-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export async function markExported(at = Date.now()): Promise<void> {
  await setSetting('lastExportAt', at);
}

export async function getLastExportAt(): Promise<number | undefined> {
  return getSetting<number>('lastExportAt');
}

export function readBackup(text: string, database: PrimeDB = db) {
  return parseBackup(text, database.verno);
}

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
  added: number;
  /** Rows skipped in merge mode because their key (or a unique field) already exists. */
  skipped: number;
}

/**
 * Imports a validated backup.
 * - replace: every table is cleared, then filled from the backup (device settings are kept).
 * - merge: rows whose primary key doesn't exist yet are added; existing rows are kept as they are,
 *   and rows conflicting on a unique field (e.g. one weigh-in per day) are skipped.
 * Tables unknown to this version are ignored. Runs in one transaction: all or nothing.
 */
export async function importBackup(
  backup: BackupFile,
  mode: ImportMode,
  database: PrimeDB = db,
): Promise<ImportResult> {
  const tables = database.tables.filter((t) => t.name in backup.tables);
  let added = 0;
  let skipped = 0;
  await database.transaction('rw', tables, async () => {
    for (const table of tables) {
      const rows = (decode(backup.tables[table.name]) as Record<string, unknown>[]).filter(
        (r) => table.name !== 'settings' || !DEVICE_SETTINGS.has(String(r.key)),
      );
      if (mode === 'replace') {
        if (table.name === 'settings') {
          const keep = (await table.toArray()).filter((r) => DEVICE_SETTINGS.has(r.key));
          await table.clear();
          await table.bulkAdd(keep);
        } else {
          await table.clear();
        }
        await table.bulkAdd(rows);
        added += rows.length;
        continue;
      }
      for (const row of rows) {
        const key = table.schema.primKey.keyPath;
        const pk = typeof key === 'string' ? row[key] : undefined;
        if (pk !== undefined && (await table.get(pk as never)) !== undefined) {
          skipped++;
          continue;
        }
        try {
          await table.add(row);
          added++;
        } catch (e) {
          // Unique-index conflict (e.g. a weigh-in already exists for that day): keep the local row.
          if (e instanceof Error && e.name === 'ConstraintError') skipped++;
          else throw e;
        }
      }
    }
  });
  return { added, skipped };
}

/** Whether the user has entered anything worth backing up (drives the reminder). */
export async function hasUserData(database: PrimeDB = db): Promise<boolean> {
  const counts = await Promise.all([
    database.foods.count(),
    database.logEntries.count(),
    database.meals.count(),
    database.workouts.count(),
    database.bodyWeights.count(),
  ]);
  return counts.some((c) => c > 0);
}

export type { BackupError, BackupFile };

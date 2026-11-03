import { describe, expect, it } from 'vitest';
import { backupCounts, backupReminderDue, daysSinceBackup, parseBackup } from './backup';

const valid = {
  app: 'prime',
  formatVersion: 1,
  schemaVersion: 5,
  exportedAt: 1_700_000_000_000,
  tables: { settings: [{ key: 'theme', value: 'dark', updatedAt: 1 }], goals: [] },
};

describe('parseBackup', () => {
  it('accepts a valid backup and counts rows', () => {
    const r = parseBackup(JSON.stringify(valid), 5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(backupCounts(r.backup)).toEqual({ settings: 1, goals: 0 });
  });

  it('rejects non-JSON, foreign files and unknown formats', () => {
    expect(parseBackup('{oops', 5)).toEqual({ ok: false, error: 'notJson' });
    expect(parseBackup('{"app":"other"}', 5)).toEqual({ ok: false, error: 'notPrime' });
    expect(parseBackup('[]', 5)).toEqual({ ok: false, error: 'notPrime' });
    expect(parseBackup(JSON.stringify({ ...valid, formatVersion: 2 }), 5)).toEqual({
      ok: false,
      error: 'unsupportedFormat',
    });
  });

  it('validates the schema version against the app', () => {
    expect(parseBackup(JSON.stringify({ ...valid, schemaVersion: 6 }), 5)).toEqual({
      ok: false,
      error: 'newerSchema',
    });
    expect(parseBackup(JSON.stringify({ ...valid, schemaVersion: 4 }), 5)).toEqual({
      ok: false,
      error: 'olderSchema',
    });
    // An older but supported backup is accepted and reported at the current schema.
    const r = parseBackup(JSON.stringify(valid), 6);
    expect(r.ok && r.backup.schemaVersion).toBe(6);
  });

  it('rejects malformed tables', () => {
    expect(parseBackup(JSON.stringify({ ...valid, tables: { foods: 'x' } }), 5)).toEqual({
      ok: false,
      error: 'malformed',
    });
    expect(parseBackup(JSON.stringify({ ...valid, tables: { foods: [1] } }), 5)).toEqual({
      ok: false,
      error: 'malformed',
    });
    expect(parseBackup(JSON.stringify({ ...valid, exportedAt: 'yesterday' }), 5)).toEqual({
      ok: false,
      error: 'malformed',
    });
    // Out of Date's range: the import preview would crash formatting it.
    expect(parseBackup(JSON.stringify({ ...valid, exportedAt: 1e300 }), 5)).toEqual({
      ok: false,
      error: 'malformed',
    });
  });
});

describe('backup reminder', () => {
  const DAY = 86_400_000;
  const now = 100 * DAY;

  it('counts whole days since the last export', () => {
    expect(daysSinceBackup(undefined, now)).toBeUndefined();
    expect(daysSinceBackup(now - 3.5 * DAY, now)).toBe(3);
    expect(daysSinceBackup(now + DAY, now)).toBe(0);
  });

  it('is due 14 days after the last export, or after first launch when never exported', () => {
    expect(backupReminderDue({ lastExportAt: now - 13 * DAY, hasData: true, now })).toBe(false);
    expect(backupReminderDue({ lastExportAt: now - 14 * DAY, hasData: true, now })).toBe(true);
    expect(backupReminderDue({ firstLaunchAt: now - 20 * DAY, hasData: true, now })).toBe(true);
    expect(backupReminderDue({ firstLaunchAt: now - 2 * DAY, hasData: true, now })).toBe(false);
  });

  it('stays quiet without data, while snoozed, or without any reference date', () => {
    expect(backupReminderDue({ lastExportAt: now - 30 * DAY, hasData: false, now })).toBe(false);
    expect(
      backupReminderDue({ lastExportAt: now - 30 * DAY, snoozedUntil: now + DAY, hasData: true, now }),
    ).toBe(false);
    expect(backupReminderDue({ hasData: true, now })).toBe(false);
  });
});

describe('parseBackup row validation', () => {
  it('rejects a well-formed envelope whose rows are invalid, saying where', () => {
    const forged = { ...valid, tables: { foods: [{ id: 1, name: 42 }] } };
    expect(parseBackup(JSON.stringify(forged), 5)).toEqual({
      ok: false,
      error: 'invalidRows',
      table: 'foods',
      index: 0,
    });
  });
});

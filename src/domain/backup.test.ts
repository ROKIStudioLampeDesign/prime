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

  it('gives the templates of v9 backups the latest loads of their exercises', () => {
    const v9 = {
      ...valid,
      schemaVersion: 9,
      tables: {
        workouts: [{ id: 1, date: '2026-11-03', status: 'done', startedAt: 3000 }],
        workoutSets: [
          {
            id: 1,
            workoutId: 1,
            exerciseId: 7,
            order: 0,
            setNumber: 1,
            weightKg: 70,
            reps: 6,
            completed: true,
          },
        ],
        templates: [
          {
            id: 1,
            name: 'B',
            exercises: [{ exerciseId: 7, targetSets: 1, sets: [{ weightKg: 50, reps: 10 }] }],
            createdAt: 0,
            updatedAt: 0,
          },
        ],
      },
    };
    const r = parseBackup(JSON.stringify(v9), 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.tables.templates?.[0]).toMatchObject({
      exercises: [{ exerciseId: 7, sets: [{ weightKg: 70, reps: 6 }] }],
    });
  });

  it('turns the jours rouges of v7 backups into days not counted, over the goal', () => {
    const v7 = {
      ...valid,
      schemaVersion: 7,
      tables: {
        gymDays: [
          { date: '2026-11-07', attended: false, red: true },
          { date: '2026-11-06', attended: true },
        ],
      },
    };
    const r = parseBackup(JSON.stringify(v7), 8);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.tables.gymDays).toEqual([
      { date: '2026-11-07', attended: false },
      { date: '2026-11-06', attended: true },
    ]);
    expect(r.backup.tables.nutritionDays).toEqual([{ date: '2026-11-07', status: 'over', updatedAt: 0 }]);
  });

  it('updates built-in muscles in v6 backups, leaving custom exercises alone', () => {
    const v6 = {
      ...valid,
      schemaVersion: 6,
      tables: {
        exercises: [
          {
            id: 1,
            seedId: 'crunch',
            name: 'Crunch',
            nameNormalized: 'crunch',
            isCustom: 0,
            equipment: 'bodyweight',
            primaryMuscles: ['abs'],
            secondaryMuscles: [],
          },
          {
            id: 2,
            name: 'Crunch',
            nameNormalized: 'crunch',
            isCustom: 1,
            primaryMuscles: ['abs'],
            secondaryMuscles: [],
          },
        ],
      },
    };
    const r = parseBackup(JSON.stringify(v6), 7);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.tables.exercises?.[0]).toMatchObject({ secondaryMuscles: ['obliques'] });
    expect(r.backup.tables.exercises?.[1]).toMatchObject({ secondaryMuscles: [] });
  });

  it('renames the built-in bench in v5 backups, leaving custom exercises alone', () => {
    const exercise = { primaryMuscles: ['chest'], secondaryMuscles: [], equipment: 'barbell' };
    const v5 = {
      ...valid,
      tables: {
        exercises: [
          {
            id: 1,
            seedId: 'bench-press',
            name: 'Développé couché (barre)',
            nameNormalized: 'developpe couche (barre)',
            isCustom: 0,
            ...exercise,
          },
          {
            id: 2,
            name: 'Développé couché (barre)',
            nameNormalized: 'developpe couche (barre)',
            isCustom: 1,
            ...exercise,
          },
        ],
      },
    };
    const r = parseBackup(JSON.stringify(v5), 6);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.tables.exercises?.[0]).toMatchObject({ name: 'Bench', nameNormalized: 'bench' });
    expect(r.backup.tables.exercises?.[1]).toMatchObject({ name: 'Développé couché (barre)' });
    // A backup already at v6 is not transformed again.
    expect(parseBackup(JSON.stringify({ ...v5, schemaVersion: 6 }), 6)).toMatchObject({
      ok: true,
      backup: { tables: { exercises: [{ name: 'Développé couché (barre)' }, {}] } },
    });
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

  it('is due 7 days after the last export, or after first launch when never exported', () => {
    expect(backupReminderDue({ lastExportAt: now - 6 * DAY, hasData: true, now })).toBe(false);
    expect(backupReminderDue({ lastExportAt: now - 7 * DAY, hasData: true, now })).toBe(true);
    expect(backupReminderDue({ firstLaunchAt: now - 8 * DAY, hasData: true, now })).toBe(true);
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

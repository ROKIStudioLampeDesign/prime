import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrimeDB } from './db';
import {
  addPartnerSet,
  createPartner,
  deletePartner,
  getPartnerRecordsBefore,
  getPartnerSets,
  listPartnerRecords,
  listPartners,
  removePartnerSet,
  renamePartner,
  setPartnerSetCompleted,
  setWorkoutPartner,
  updatePartnerSet,
} from './partners';
import { getRecordsBefore, listExerciseHistory } from './stats';
import {
  addExerciseToWorkout,
  deleteWorkout,
  finishWorkout,
  getWorkout,
  getWorkoutSets,
  removeExercise,
  setCompleted,
  startWorkout,
  updateSet,
} from './workouts';

let n = 0;
let db: PrimeDB;
beforeEach(() => {
  db = new PrimeDB(`prime-partners-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

async function seededId(seedId: string): Promise<number> {
  const ex = await db.exercises.where('seedId').equals(seedId).first();
  if (!ex) throw new Error(seedId);
  return ex.id;
}

/** A finished workout where you and the teammate each validated every set. */
async function sessionTogether(partnerId: number, exerciseId: number, mineKg: number, theirsKg: number) {
  const id = await startWorkout(undefined, db, partnerId);
  await addExerciseToWorkout(id, exerciseId, { setCount: 2 }, db);
  for (const s of await getWorkoutSets(id, db)) {
    await updateSet(s.id, { weightKg: mineKg, reps: 8 }, db);
    await setCompleted(s.id, true, 0, db);
  }
  for (const s of await getPartnerSets(id, db)) {
    await updatePartnerSet(s.id, { weightKg: theirsKg, reps: 10 }, db);
    await setPartnerSetCompleted(s.id, true, 0, db);
  }
  await finishWorkout(id, db);
  return id;
}

describe('teammates', () => {
  it('creates, lists by name, renames, and refuses an empty name', async () => {
    await createPartner('  Lucas ', db);
    await createPartner('Inès', db);
    expect((await listPartners(db)).map((p) => p.name)).toEqual(['Inès', 'Lucas']);
    const lucas = (await listPartners(db))[1];
    if (!lucas) throw new Error('lucas');
    await renamePartner(lucas.id, 'Luc', db);
    await renamePartner(lucas.id, '   ', db);
    expect((await db.partners.get(lucas.id))?.name).toBe('Luc');
    await expect(createPartner(' ', db)).rejects.toThrow();
  });

  it('gives the teammate as many sets as yours, from your values the first time', async () => {
    const bench = await seededId('bench-press');
    const lucas = await createPartner('Lucas', db);
    const id = await startWorkout(undefined, db, lucas);
    await addExerciseToWorkout(id, bench, { setCount: 3 }, db);
    const mine = await getWorkoutSets(id, db);
    const theirs = await getPartnerSets(id, db);
    expect(theirs).toHaveLength(3);
    expect(theirs.map((s) => [s.setNumber, s.weightKg, s.reps, s.completed])).toEqual(
      mine.map((s) => [s.setNumber, s.weightKg, s.reps, false]),
    );
  });

  it('prefills the teammate from their own last session, not yours', async () => {
    const bench = await seededId('bench-press');
    const lucas = await createPartner('Lucas', db);
    await sessionTogether(lucas, bench, 80, 60);
    const id = await startWorkout(undefined, db, lucas);
    await addExerciseToWorkout(id, bench, {}, db);
    expect((await getPartnerSets(id, db)).map((s) => s.weightKg)).toEqual([60, 60]);
    expect((await getWorkoutSets(id, db)).map((s) => s.weightKg)).toEqual([80, 80]);
  });

  it('never counts the teammate’s sets in your records, history or volume', async () => {
    const bench = await seededId('bench-press');
    const lucas = await createPartner('Lucas', db);
    await sessionTogether(lucas, bench, 60, 100);
    const history = (await listExerciseHistory(db)).get(bench) ?? [];
    expect(history.every((h) => h.weightKg === 60)).toBe(true);
    const later = { id: 999, startedAt: Date.now() + 1000 };
    expect((await getRecordsBefore(bench, later, db)).weight?.weightKg).toBe(60);
    expect((await getPartnerRecordsBefore(lucas, bench, later, db)).weight?.weightKg).toBe(100);
    expect(await listPartnerRecords(lucas, db)).toEqual([
      expect.objectContaining({ exerciseId: bench, sessions: 1 }),
    ]);
  });

  it('adds, removes and renumbers the teammate’s sets; finishing drops their unvalidated ones', async () => {
    const bench = await seededId('bench-press');
    const lucas = await createPartner('Lucas', db);
    const id = await startWorkout(undefined, db, lucas);
    await addExerciseToWorkout(id, bench, { setCount: 2 }, db);
    await addPartnerSet(id, bench, db);
    let theirs = await getPartnerSets(id, db);
    expect(theirs.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    const [first, second] = theirs;
    if (!first || !second) throw new Error('sets');
    await removePartnerSet(first.id, db);
    theirs = await getPartnerSets(id, db);
    expect(theirs.map((s) => s.setNumber)).toEqual([1, 2]);
    await setPartnerSetCompleted(second.id, true, 90, db);
    expect((await getWorkout(id, db))?.restEndsAt).toBeGreaterThan(Date.now());
    await finishWorkout(id, db);
    expect((await getPartnerSets(id, db)).map((s) => s.id)).toEqual([second.id]);
  });

  it('removing an exercise or the workout removes the teammate’s sets too', async () => {
    const bench = await seededId('bench-press');
    const lucas = await createPartner('Lucas', db);
    const id = await startWorkout(undefined, db, lucas);
    await addExerciseToWorkout(id, bench, { setCount: 2 }, db);
    await removeExercise(id, bench, db);
    expect(await getPartnerSets(id, db)).toEqual([]);
    await addExerciseToWorkout(id, bench, { setCount: 1 }, db);
    await deleteWorkout(id, db);
    expect(await db.partnerSets.count()).toBe(0);
  });

  it('changing the teammate of a workout swaps their sets', async () => {
    const bench = await seededId('bench-press');
    const lucas = await createPartner('Lucas', db);
    const ines = await createPartner('Inès', db);
    const id = await startWorkout(undefined, db);
    await addExerciseToWorkout(id, bench, { setCount: 2 }, db);
    expect(await getPartnerSets(id, db)).toEqual([]);
    await setWorkoutPartner(id, lucas, db);
    expect((await getPartnerSets(id, db)).map((s) => s.partnerId)).toEqual([lucas, lucas]);
    await setWorkoutPartner(id, ines, db);
    expect((await getPartnerSets(id, db)).map((s) => s.partnerId)).toEqual([ines, ines]);
    await setWorkoutPartner(id, undefined, db);
    expect(await getPartnerSets(id, db)).toEqual([]);
    expect((await getWorkout(id, db))?.partnerId).toBeUndefined();
  });

  it('deleting a teammate removes their sets and leaves your workouts solo', async () => {
    const bench = await seededId('bench-press');
    const lucas = await createPartner('Lucas', db);
    const id = await sessionTogether(lucas, bench, 80, 60);
    await deletePartner(lucas, db);
    expect(await db.partnerSets.count()).toBe(0);
    expect((await getWorkout(id, db))?.partnerId).toBeUndefined();
    expect((await getWorkoutSets(id, db)).length).toBe(2);
  });
});

import { normalizeText } from '../domain/search';
import { personalRecords, type HistorySet, type PersonalRecords } from '../domain/strength';
import {
  lastPerformanceSession,
  nextSetValues,
  prefillPartnerSets,
  type WorkoutHistoryItem,
} from '../domain/workout';
import { db, type Partner, type PartnerSet, type PrimeDB, type Workout } from './db';

/** Teammates, by name. */
export async function listPartners(database: PrimeDB = db): Promise<Partner[]> {
  const partners = await database.partners.toArray();
  return partners.sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)));
}

export function getPartner(id: number, database: PrimeDB = db): Promise<Partner | undefined> {
  return database.partners.get(id);
}

export async function createPartner(name: string, database: PrimeDB = db, now = Date.now()): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A teammate needs a name');
  return database.partners.add({ name: trimmed, createdAt: now });
}

export async function renamePartner(id: number, name: string, database: PrimeDB = db): Promise<void> {
  const trimmed = name.trim();
  if (trimmed) await database.partners.update(id, { name: trimmed });
}

/** Deletes a teammate with all their sets; your workouts with them become solo ones. */
export async function deletePartner(id: number, database: PrimeDB = db): Promise<void> {
  await database.transaction('rw', [database.partners, database.partnerSets, database.workouts], async () => {
    await database.partnerSets.where('partnerId').equals(id).delete();
    const workouts = await database.workouts.filter((w) => w.partnerId === id).toArray();
    await Promise.all(workouts.map((w) => database.workouts.update(w.id, { partnerId: undefined })));
    await database.partners.delete(id);
  });
}

/** The teammate's sets in a workout, by exercise then set number. */
export async function getPartnerSets(workoutId: number, database: PrimeDB = db): Promise<PartnerSet[]> {
  const sets = await database.partnerSets.where('workoutId').equals(workoutId).toArray();
  return sets.sort((a, b) => a.exerciseId - b.exerciseId || a.setNumber - b.setNumber);
}

/** The teammate's finished workouts holding `exerciseId`, for prefills. */
async function partnerHistory(
  partnerId: number,
  exerciseId: number,
  database: PrimeDB,
): Promise<WorkoutHistoryItem[]> {
  const sets = await database.partnerSets.where({ partnerId, exerciseId }).toArray();
  const workouts = await database.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))]);
  return workouts
    .filter((w): w is Workout => w !== undefined && w.status === 'done')
    .map((w) => ({
      workoutId: w.id,
      startedAt: w.startedAt,
      sets: sets.filter((s) => s.workoutId === w.id),
    }));
}

async function partnerPrevious(workout: Workout, partnerId: number, exerciseId: number, database: PrimeDB) {
  if (workout.status === 'done') return undefined;
  return lastPerformanceSession(await partnerHistory(partnerId, exerciseId, database), exerciseId, {
    before: workout.startedAt,
    excludeWorkoutId: workout.id,
  })?.sets;
}

/**
 * Gives the workout's teammate their sets for an exercise, unless they already have some:
 * as many as yours, from their own last performance (`prefillPartnerSets`). Runs inside the
 * caller's transaction, which must cover workouts, workoutSets and partnerSets.
 */
export async function addPartnerExercise(
  workout: Workout,
  exerciseId: number,
  database: PrimeDB = db,
): Promise<void> {
  const partnerId = workout.partnerId;
  if (partnerId === undefined) return;
  const existing = await database.partnerSets.where({ partnerId, exerciseId }).toArray();
  if (existing.some((s) => s.workoutId === workout.id)) return;
  const mine = (await database.workoutSets.where({ exerciseId, workoutId: workout.id }).toArray()).sort(
    (a, b) => a.setNumber - b.setNumber,
  );
  const previous = await partnerPrevious(workout, partnerId, exerciseId, database);
  await database.partnerSets.bulkAdd(
    prefillPartnerSets(previous, mine).map((p) => ({
      workoutId: workout.id,
      partnerId,
      exerciseId,
      setNumber: p.setNumber,
      weightKg: p.weightKg,
      reps: p.reps,
      completed: false,
    })),
  );
}

/**
 * Sets (or clears) the teammate of a workout. A new teammate gets sets for every exercise
 * already there; the previous teammate's sets in this workout are deleted.
 */
export async function setWorkoutPartner(
  workoutId: number,
  partnerId: number | undefined,
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction(
    'rw',
    [database.workouts, database.workoutSets, database.partnerSets],
    async () => {
      const workout = await database.workouts.get(workoutId);
      if (!workout || workout.partnerId === partnerId) return;
      await database.partnerSets.where('workoutId').equals(workoutId).delete();
      await database.workouts.update(workoutId, { partnerId });
      if (partnerId === undefined) return;
      const exerciseIds = new Set(
        (await database.workoutSets.where('workoutId').equals(workoutId).toArray()).map((s) => s.exerciseId),
      );
      for (const exerciseId of exerciseIds) {
        await addPartnerExercise({ ...workout, partnerId }, exerciseId, database);
      }
    },
  );
}

export async function addPartnerSet(
  workoutId: number,
  exerciseId: number,
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction('rw', [database.workouts, database.partnerSets], async () => {
    const workout = await database.workouts.get(workoutId);
    const partnerId = workout?.partnerId;
    if (!workout || partnerId === undefined) return;
    const current = (await database.partnerSets.where({ partnerId, exerciseId }).toArray())
      .filter((s) => s.workoutId === workoutId)
      .sort((a, b) => a.setNumber - b.setNumber);
    const next = nextSetValues(current, await partnerPrevious(workout, partnerId, exerciseId, database));
    await database.partnerSets.add({
      workoutId,
      partnerId,
      exerciseId,
      setNumber: next.setNumber,
      weightKg: next.weightKg,
      reps: next.reps,
      completed: false,
    });
  });
}

/** Removes a teammate's set and renumbers their remaining sets of that exercise. */
export async function removePartnerSet(setId: number, database: PrimeDB = db): Promise<void> {
  await database.transaction('rw', database.partnerSets, async () => {
    const set = await database.partnerSets.get(setId);
    if (!set) return;
    await database.partnerSets.delete(setId);
    const rest = (
      await database.partnerSets.where({ partnerId: set.partnerId, exerciseId: set.exerciseId }).toArray()
    )
      .filter((s) => s.workoutId === set.workoutId)
      .sort((a, b) => a.setNumber - b.setNumber);
    await Promise.all(rest.map((s, i) => database.partnerSets.update(s.id, { setNumber: i + 1 })));
  });
}

export async function updatePartnerSet(
  setId: number,
  changes: Partial<Pick<PartnerSet, 'weightKg' | 'reps' | 'rpe'>>,
  database: PrimeDB = db,
): Promise<void> {
  await database.partnerSets.update(setId, changes);
}

/** Marks a teammate's set done/undone; completing one starts the shared rest timer, like yours. */
export async function setPartnerSetCompleted(
  setId: number,
  completed: boolean,
  restSeconds = 0,
  database: PrimeDB = db,
): Promise<void> {
  await database.transaction('rw', [database.workouts, database.partnerSets], async () => {
    const set = await database.partnerSets.get(setId);
    if (!set) return;
    const now = Date.now();
    await database.partnerSets.update(setId, { completed, completedAt: completed ? now : undefined });
    const workout = await database.workouts.get(set.workoutId);
    if (completed && workout?.status === 'active' && restSeconds > 0) {
      await database.workouts.update(workout.id, { restEndsAt: now + restSeconds * 1000 });
    }
  });
}

/** The teammate's records on an exercise from before a workout (for their live PR badge). */
export async function getPartnerRecordsBefore(
  partnerId: number,
  exerciseId: number,
  workout: Pick<Workout, 'id' | 'startedAt'>,
  database: PrimeDB = db,
): Promise<PersonalRecords> {
  const sets = await database.partnerSets.where({ partnerId, exerciseId }).toArray();
  const workouts = await database.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))]);
  const byId = new Map(workouts.filter((w): w is Workout => w !== undefined).map((w) => [w.id, w]));
  const history: HistorySet[] = sets.flatMap((s) => {
    const w = byId.get(s.workoutId);
    return w && s.completed && w.id !== workout.id && w.status === 'done' && w.startedAt < workout.startedAt
      ? [{ workoutId: w.id, date: w.date, startedAt: w.startedAt, weightKg: s.weightKg, reps: s.reps }]
      : [];
  });
  return personalRecords(history);
}

export interface PartnerExerciseBest {
  exerciseId: number;
  records: PersonalRecords;
  sessions: number;
}

/** A teammate's records per exercise, over finished workouts (for their page in Réglages). */
export async function listPartnerRecords(
  partnerId: number,
  database: PrimeDB = db,
): Promise<PartnerExerciseBest[]> {
  const sets = await database.partnerSets.where('partnerId').equals(partnerId).toArray();
  const workouts = await database.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))]);
  const byId = new Map(
    workouts.filter((w): w is Workout => w !== undefined && w.status === 'done').map((w) => [w.id, w]),
  );
  const byExercise = new Map<number, HistorySet[]>();
  for (const s of sets) {
    const w = byId.get(s.workoutId);
    if (!w || !s.completed) continue;
    byExercise.set(s.exerciseId, [
      ...(byExercise.get(s.exerciseId) ?? []),
      { workoutId: w.id, date: w.date, startedAt: w.startedAt, weightKg: s.weightKg, reps: s.reps },
    ]);
  }
  return [...byExercise].map(([exerciseId, history]) => ({
    exerciseId,
    records: personalRecords(history),
    sessions: new Set(history.map((h) => h.workoutId)).size,
  }));
}

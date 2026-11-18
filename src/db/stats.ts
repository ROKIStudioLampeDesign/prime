import type { LocalDate } from '../domain/date';
import { personalRecords, type HistorySet, type PersonalRecords } from '../domain/strength';
import { workoutVolume } from '../domain/workout';
import { db, type LogEntry, type PrimeDB, type Workout } from './db';

/**
 * Completed sets of finished workouts, grouped by exercise (oldest first). The active workout is
 * excluded: progression and records only include sessions that are over.
 */
export async function listExerciseHistory(database: PrimeDB = db): Promise<Map<number, HistorySet[]>> {
  const [workouts, sets] = await Promise.all([
    database.workouts.where('status').equals('done').toArray(),
    database.workoutSets.toArray(),
  ]);
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const out = new Map<number, HistorySet[]>();
  for (const s of sets) {
    const w = byId.get(s.workoutId);
    if (!w || !s.completed) continue;
    const list = out.get(s.exerciseId) ?? [];
    list.push({ workoutId: w.id, date: w.date, startedAt: w.startedAt, weightKg: s.weightKg, reps: s.reps });
    out.set(s.exerciseId, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.startedAt - b.startedAt);
  return out;
}

/**
 * Personal records of an exercise established before a workout started (that workout excluded),
 * used for live PR badges: a set only counts as a PR against what existed before the session.
 */
export async function getRecordsBefore(
  exerciseId: number,
  workout: Pick<Workout, 'id' | 'startedAt'>,
  database: PrimeDB = db,
): Promise<PersonalRecords> {
  const sets = await database.workoutSets.where('exerciseId').equals(exerciseId).toArray();
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

/** Heaviest load lifted for at least one rep in a finished workout (0 without one). */
export async function getBestKg(exerciseId: number, database: PrimeDB = db): Promise<number> {
  const history = (await listExerciseHistory(database)).get(exerciseId) ?? [];
  return personalRecords(history).weight?.weightKg ?? 0;
}

export function listEntriesBetween(
  start: LocalDate,
  end: LocalDate,
  database: PrimeDB = db,
): Promise<LogEntry[]> {
  return database.logEntries.where('date').between(start, end, true, true).toArray();
}

/** Finished workouts in a date range with their training volume (completed sets). */
export async function listWorkoutVolumesBetween(
  start: LocalDate,
  end: LocalDate,
  database: PrimeDB = db,
): Promise<{ date: LocalDate; volumeKg: number }[]> {
  const workouts = (await database.workouts.where('date').between(start, end, true, true).toArray()).filter(
    (w) => w.status === 'done',
  );
  const sets = await database.workoutSets
    .where('workoutId')
    .anyOf(workouts.map((w) => w.id))
    .toArray();
  return workouts.map((w) => ({
    date: w.date,
    volumeKg: workoutVolume(sets.filter((s) => s.workoutId === w.id)),
  }));
}

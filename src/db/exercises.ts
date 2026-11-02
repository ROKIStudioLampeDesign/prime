import type { ExerciseDefinition } from '../domain/exercise';
import { normalizeText } from '../domain/search';
import { db, type Exercise, type PrimeDB } from './db';

export function listExercises(database: PrimeDB = db): Promise<Exercise[]> {
  return database.exercises.toArray();
}

export function getExercise(id: number, database: PrimeDB = db): Promise<Exercise | undefined> {
  return database.exercises.get(id);
}

function toRecord(def: ExerciseDefinition) {
  const name = def.name.trim();
  return {
    name,
    nameNormalized: normalizeText(name),
    primaryMuscles: [...def.primaryMuscles],
    secondaryMuscles: def.secondaryMuscles.filter((m) => !def.primaryMuscles.includes(m)),
    equipment: def.equipment,
  };
}

export async function createExercise(def: ExerciseDefinition, database: PrimeDB = db): Promise<number> {
  return database.exercises.add({ ...toRecord(def), isCustom: 1 });
}

/** Updates a custom exercise. Built-in exercises are read-only. */
export async function updateExercise(
  id: number,
  def: ExerciseDefinition,
  database: PrimeDB = db,
): Promise<void> {
  const existing = await database.exercises.get(id);
  if (!existing) throw new Error(`Exercise ${id} not found`);
  if (existing.isCustom !== 1) throw new Error('Built-in exercises cannot be edited');
  await database.exercises.update(id, toRecord(def));
}

export interface ExerciseUsage {
  workouts: number;
  templates: number;
}

export async function exerciseUsage(id: number, database: PrimeDB = db): Promise<ExerciseUsage> {
  const sets = await database.workoutSets.where('exerciseId').equals(id).toArray();
  const templates = await database.templates
    .filter((t) => t.exercises.some((e) => e.exerciseId === id))
    .count();
  return { workouts: new Set(sets.map((s) => s.workoutId)).size, templates };
}

/** Deletes a custom exercise that no workout or template uses (history must never be orphaned). */
export async function deleteExercise(id: number, database: PrimeDB = db): Promise<void> {
  await database.transaction(
    'rw',
    [database.exercises, database.workoutSets, database.templates],
    async () => {
      const existing = await database.exercises.get(id);
      if (!existing) return;
      if (existing.isCustom !== 1) throw new Error('Built-in exercises cannot be deleted');
      const usage = await exerciseUsage(id, database);
      if (usage.workouts > 0 || usage.templates > 0) throw new Error('Exercise is in use');
      await database.exercises.delete(id);
    },
  );
}

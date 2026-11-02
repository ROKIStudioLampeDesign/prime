import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Exercise } from '../../db/db';
import { listExercises } from '../../db/exercises';
import { MUSCLES, type MuscleId } from '../../domain/muscles';

/** All exercises by id (undefined while loading). */
export function useExercisesById(): Map<number, Exercise> | undefined {
  const exercises = useLiveQuery(listExercises);
  return useMemo(() => exercises && new Map(exercises.map((e) => [e.id, e])), [exercises]);
}

export function musclesLabel(muscles: readonly MuscleId[]): string {
  return muscles.map((m) => MUSCLES[m].label).join(', ');
}

/** Name of an exercise that may have disappeared (it can't be deleted while used, but be safe). */
export function exerciseName(exercises: ReadonlyMap<number, Exercise>, id: number): string {
  return exercises.get(id)?.name ?? 'Exercice inconnu';
}

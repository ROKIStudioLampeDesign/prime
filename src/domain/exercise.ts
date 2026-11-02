import type { MuscleId } from './muscles';

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'other',
] as const;

export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Readonly<Record<Equipment, string>> = {
  barbell: 'Barre',
  dumbbell: 'Haltères',
  machine: 'Machine',
  cable: 'Poulie',
  bodyweight: 'Poids du corps',
  kettlebell: 'Kettlebell',
  other: 'Autre',
};

export interface ExerciseDefinition {
  name: string;
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  equipment?: Equipment;
}

/**
 * Muscle model: the single source of truth for exercises, the muscle picker and the body map.
 * Add a muscle here and everything else (labels, views, pickers) follows.
 */
export const MUSCLE_IDS = [
  'chest',
  'shoulders_front',
  'shoulders_side',
  'shoulders_rear',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'traps',
  'lats',
  'upper_back',
  'lower_back',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'adductors',
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

export type BodyView = 'front' | 'back';

export type MuscleGroup = 'upper' | 'core' | 'lower';

export interface MuscleInfo {
  /** French display label. */
  label: string;
  group: MuscleGroup;
  /** Body map views on which the muscle is drawn. */
  views: readonly BodyView[];
}

export const MUSCLES: Readonly<Record<MuscleId, MuscleInfo>> = {
  chest: { label: 'Pectoraux', group: 'upper', views: ['front'] },
  shoulders_front: { label: 'Épaules (avant)', group: 'upper', views: ['front'] },
  shoulders_side: { label: 'Épaules (côté)', group: 'upper', views: ['front', 'back'] },
  shoulders_rear: { label: 'Épaules (arrière)', group: 'upper', views: ['back'] },
  biceps: { label: 'Biceps', group: 'upper', views: ['front'] },
  triceps: { label: 'Triceps', group: 'upper', views: ['back'] },
  forearms: { label: 'Avant-bras', group: 'upper', views: ['front', 'back'] },
  traps: { label: 'Trapèzes', group: 'upper', views: ['front', 'back'] },
  lats: { label: 'Grand dorsal', group: 'upper', views: ['back'] },
  upper_back: { label: 'Haut du dos', group: 'upper', views: ['back'] },
  abs: { label: 'Abdominaux', group: 'core', views: ['front'] },
  obliques: { label: 'Obliques', group: 'core', views: ['front'] },
  lower_back: { label: 'Lombaires', group: 'core', views: ['back'] },
  glutes: { label: 'Fessiers', group: 'lower', views: ['back'] },
  quads: { label: 'Quadriceps', group: 'lower', views: ['front'] },
  hamstrings: { label: 'Ischio-jambiers', group: 'lower', views: ['back'] },
  calves: { label: 'Mollets', group: 'lower', views: ['front', 'back'] },
  adductors: { label: 'Adducteurs', group: 'lower', views: ['front'] },
};

export const MUSCLE_GROUP_LABELS: Readonly<Record<MuscleGroup, string>> = {
  upper: 'Haut du corps',
  core: 'Tronc',
  lower: 'Bas du corps',
};

export function isMuscleId(value: string): value is MuscleId {
  return (MUSCLE_IDS as readonly string[]).includes(value);
}

export function musclesForView(view: BodyView): MuscleId[] {
  return MUSCLE_IDS.filter((id) => MUSCLES[id].views.includes(view));
}

export function musclesInGroup(group: MuscleGroup): MuscleId[] {
  return MUSCLE_IDS.filter((id) => MUSCLES[id].group === group);
}

export interface MuscleSelectionErrors {
  primary?: 'required';
  /** Muscles listed as both primary and secondary. */
  overlap?: MuscleId[];
}

export function validateMuscleSelection(
  primary: readonly MuscleId[],
  secondary: readonly MuscleId[],
): MuscleSelectionErrors {
  const errors: MuscleSelectionErrors = {};
  if (primary.length === 0) errors.primary = 'required';
  const overlap = primary.filter((m) => secondary.includes(m));
  if (overlap.length > 0) errors.overlap = overlap;
  return errors;
}

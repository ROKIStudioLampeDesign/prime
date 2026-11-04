import type { Equipment, ExerciseDefinition } from '../domain/exercise';
import type { MuscleId } from '../domain/muscles';

export interface SeedExercise extends ExerciseDefinition {
  /** Stable identifier, so future seed updates can be matched to existing rows. Never change one. */
  seedId: string;
}

/** The barbell bench press: the only lift Stats › Records follows. */
export const BENCH_SEED_ID = 'bench-press';

function ex(
  seedId: string,
  name: string,
  equipment: Equipment,
  primaryMuscles: MuscleId[],
  secondaryMuscles: MuscleId[] = [],
): SeedExercise {
  return { seedId, name, equipment, primaryMuscles, secondaryMuscles };
}

/** Built-in exercise library. Primary = prime movers; secondary = significant synergists. */
export const EXERCISE_SEED: readonly SeedExercise[] = [
  // Chest
  // Renamed from "Développé couché (barre)" in schema v6 (see syncBuiltInNames).
  ex(BENCH_SEED_ID, 'Bench', 'barbell', ['chest'], ['shoulders_front', 'triceps']),
  ex(
    'incline-bench-press',
    'Développé incliné (barre)',
    'barbell',
    ['chest'],
    ['shoulders_front', 'triceps'],
  ),
  ex(
    'decline-bench-press',
    'Développé décliné (barre)',
    'barbell',
    ['chest'],
    ['triceps', 'shoulders_front'],
  ),
  ex('db-bench-press', 'Développé couché (haltères)', 'dumbbell', ['chest'], ['shoulders_front', 'triceps']),
  ex(
    'db-incline-press',
    'Développé incliné (haltères)',
    'dumbbell',
    ['chest'],
    ['shoulders_front', 'triceps'],
  ),
  ex('db-fly', 'Écarté couché (haltères)', 'dumbbell', ['chest'], ['shoulders_front']),
  ex('cable-crossover', 'Écarté à la poulie (vis-à-vis)', 'cable', ['chest'], ['shoulders_front']),
  ex('pec-deck', 'Pec deck (butterfly)', 'machine', ['chest'], ['shoulders_front']),
  ex(
    'chest-press-machine',
    'Développé à la machine (pectoraux)',
    'machine',
    ['chest'],
    ['shoulders_front', 'triceps'],
  ),
  ex('push-up', 'Pompes', 'bodyweight', ['chest'], ['triceps', 'shoulders_front', 'abs']),
  ex('dips', 'Dips', 'bodyweight', ['chest', 'triceps'], ['shoulders_front']),

  // Back
  ex('pull-up', 'Tractions (pronation)', 'bodyweight', ['lats'], ['biceps', 'upper_back', 'forearms']),
  ex('chin-up', 'Tractions (supination)', 'bodyweight', ['lats', 'biceps'], ['upper_back', 'forearms']),
  ex('lat-pulldown', 'Tirage vertical (poulie haute)', 'cable', ['lats'], ['biceps', 'upper_back']),
  ex('close-grip-pulldown', 'Tirage vertical prise serrée', 'cable', ['lats'], ['biceps', 'upper_back']),
  ex(
    'barbell-row',
    'Rowing barre',
    'barbell',
    ['upper_back', 'lats'],
    ['biceps', 'shoulders_rear', 'lower_back'],
  ),
  ex('db-row', 'Rowing haltère unilatéral', 'dumbbell', ['lats', 'upper_back'], ['biceps', 'shoulders_rear']),
  ex(
    'seated-cable-row',
    'Tirage horizontal (poulie basse)',
    'cable',
    ['upper_back', 'lats'],
    ['biceps', 'shoulders_rear'],
  ),
  ex(
    't-bar-row',
    'Rowing T-bar',
    'barbell',
    ['upper_back', 'lats'],
    ['biceps', 'shoulders_rear', 'lower_back'],
  ),
  ex('machine-row', 'Rowing à la machine', 'machine', ['upper_back', 'lats'], ['biceps', 'shoulders_rear']),
  ex('straight-arm-pulldown', 'Pull-over à la poulie (bras tendus)', 'cable', ['lats'], ['triceps']),
  ex(
    'deadlift',
    'Soulevé de terre',
    'barbell',
    ['hamstrings', 'glutes', 'lower_back'],
    // Lats added in schema v7 (see syncBuiltInMuscles): they keep the bar against the legs.
    ['quads', 'traps', 'upper_back', 'lats', 'forearms'],
  ),
  ex(
    'back-extension',
    'Extension lombaire (banc à 45°)',
    'bodyweight',
    ['lower_back'],
    ['glutes', 'hamstrings'],
  ),
  ex('barbell-shrug', 'Shrugs (barre)', 'barbell', ['traps'], ['forearms']),
  ex('db-shrug', 'Shrugs (haltères)', 'dumbbell', ['traps'], ['forearms']),
  ex('face-pull', 'Face pull', 'cable', ['shoulders_rear'], ['upper_back', 'traps']),

  // Shoulders
  ex(
    'overhead-press',
    'Développé militaire (barre)',
    'barbell',
    ['shoulders_front'],
    ['shoulders_side', 'triceps', 'traps'],
  ),
  ex(
    'db-shoulder-press',
    'Développé épaules (haltères)',
    'dumbbell',
    ['shoulders_front'],
    ['shoulders_side', 'triceps'],
  ),
  ex(
    'machine-shoulder-press',
    'Développé épaules à la machine',
    'machine',
    ['shoulders_front'],
    ['shoulders_side', 'triceps'],
  ),
  ex('arnold-press', 'Développé Arnold', 'dumbbell', ['shoulders_front', 'shoulders_side'], ['triceps']),
  ex('lateral-raise', 'Élévations latérales (haltères)', 'dumbbell', ['shoulders_side'], ['traps']),
  ex('cable-lateral-raise', 'Élévations latérales à la poulie', 'cable', ['shoulders_side'], ['traps']),
  ex('machine-lateral-raise', 'Élévations latérales à la machine', 'machine', ['shoulders_side'], ['traps']),
  ex('front-raise', 'Élévations frontales', 'dumbbell', ['shoulders_front'], ['chest']),
  ex('rear-delt-fly', 'Oiseau (haltères)', 'dumbbell', ['shoulders_rear'], ['upper_back', 'traps']),
  ex('reverse-pec-deck', 'Reverse pec deck', 'machine', ['shoulders_rear'], ['upper_back']),
  ex('upright-row', 'Rowing menton', 'barbell', ['shoulders_side', 'traps'], ['biceps', 'shoulders_front']),

  // Arms
  ex('barbell-curl', 'Curl barre', 'barbell', ['biceps'], ['forearms']),
  ex('db-curl', 'Curl haltères', 'dumbbell', ['biceps'], ['forearms']),
  ex('hammer-curl', 'Curl marteau', 'dumbbell', ['biceps', 'forearms']),
  ex('preacher-curl', 'Curl pupitre', 'barbell', ['biceps'], ['forearms']),
  ex('incline-db-curl', 'Curl incliné (haltères)', 'dumbbell', ['biceps'], ['forearms']),
  ex('cable-curl', 'Curl à la poulie', 'cable', ['biceps'], ['forearms']),
  ex('triceps-pushdown', 'Extension triceps à la poulie', 'cable', ['triceps']),
  ex('overhead-triceps-extension', 'Extension triceps au-dessus de la tête', 'cable', ['triceps']),
  ex('skull-crusher', 'Barre au front', 'barbell', ['triceps']),
  ex(
    'close-grip-bench-press',
    'Développé couché prise serrée',
    'barbell',
    ['triceps', 'chest'],
    ['shoulders_front'],
  ),
  ex('db-kickback', 'Kickback (haltère)', 'dumbbell', ['triceps']),
  ex('wrist-curl', 'Curl poignets', 'barbell', ['forearms']),

  // Legs
  ex(
    'back-squat',
    'Squat (barre)',
    'barbell',
    ['quads', 'glutes'],
    ['adductors', 'hamstrings', 'lower_back'],
  ),
  ex('front-squat', 'Squat avant', 'barbell', ['quads'], ['glutes', 'abs', 'upper_back']),
  ex('goblet-squat', 'Goblet squat', 'dumbbell', ['quads', 'glutes'], ['adductors', 'abs']),
  ex('leg-press', 'Presse à cuisses', 'machine', ['quads', 'glutes'], ['adductors', 'hamstrings']),
  ex('hack-squat', 'Hack squat', 'machine', ['quads'], ['glutes']),
  ex('leg-extension', 'Leg extension', 'machine', ['quads']),
  ex('lying-leg-curl', 'Leg curl allongé', 'machine', ['hamstrings'], ['calves']),
  ex('seated-leg-curl', 'Leg curl assis', 'machine', ['hamstrings']),
  ex(
    'romanian-deadlift',
    'Soulevé de terre roumain',
    'barbell',
    ['hamstrings', 'glutes'],
    ['lower_back', 'forearms'],
  ),
  ex(
    'bulgarian-split-squat',
    'Fentes bulgares',
    'dumbbell',
    ['quads', 'glutes'],
    ['adductors', 'hamstrings'],
  ),
  ex(
    'walking-lunge',
    'Fentes marchées',
    'dumbbell',
    ['quads', 'glutes'],
    ['adductors', 'hamstrings', 'calves'],
  ),
  ex('hip-thrust', 'Hip thrust', 'barbell', ['glutes'], ['hamstrings', 'adductors']),
  ex(
    'kettlebell-swing',
    'Kettlebell swing',
    'kettlebell',
    ['glutes', 'hamstrings'],
    ['lower_back', 'forearms'],
  ),
  ex('standing-calf-raise', 'Mollets debout', 'machine', ['calves']),
  ex('seated-calf-raise', 'Mollets assis', 'machine', ['calves']),
  ex('hip-adduction', 'Adducteurs à la machine', 'machine', ['adductors']),
  ex('hip-abduction', 'Abducteurs à la machine', 'machine', ['glutes']),

  // Core
  // Obliques added in schema v7 (see syncBuiltInMuscles).
  ex('crunch', 'Crunch', 'bodyweight', ['abs'], ['obliques']),
  ex('cable-crunch', 'Crunch à la poulie', 'cable', ['abs'], ['obliques']),
  ex('hanging-leg-raise', 'Relevés de jambes suspendu', 'bodyweight', ['abs'], ['obliques', 'forearms']),
  ex('ab-wheel', 'Roulette abdominale', 'other', ['abs'], ['obliques', 'lats']),
  ex('russian-twist', 'Russian twist', 'bodyweight', ['obliques'], ['abs']),
  ex('cable-woodchop', 'Bûcheron à la poulie', 'cable', ['obliques'], ['abs', 'shoulders_front']),
];

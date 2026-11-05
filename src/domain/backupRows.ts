import { isLocalDate } from './date';
import { EQUIPMENT } from './exercise';
import { isMuscleId } from './muscles';
import { MEAL_SLOTS } from './nutrition';

/**
 * Row-level validation of a backup file. The envelope check (app, versions) is not enough: a
 * forged or corrupted file with the right envelope must not put rows into IndexedDB that would
 * crash the UI later. Each table gets a schema of the fields the app relies on; extra fields
 * are allowed (forward compatibility), unknown tables are ignored by the importer.
 *
 * Keep SCHEMAS in step with the row types in db/db.ts: when a field is added, renamed or becomes
 * required, update its schema here (and add a BACKUP_MIGRATIONS transform if stored data
 * changes), otherwise new exports become unrestorable. The round-trip test in db/backup.test.ts
 * writes through every app writer to catch such drift.
 */

type Check = (value: unknown) => boolean;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const finite: Check = (v) => typeof v === 'number' && Number.isFinite(v);
const nonNegative: Check = (v) => finite(v) && (v as number) >= 0;
const id: Check = (v) => Number.isInteger(v) && (v as number) > 0;
const text: Check = (v) => typeof v === 'string';
const bool: Check = (v) => typeof v === 'boolean';
const localDate: Check = (v) => typeof v === 'string' && isLocalDate(v);
const zeroOrOne: Check = (v) => v === 0 || v === 1;
const anything: Check = () => true;
/** Epoch ms within the range `Date` accepts, so formatting the value can never throw. */
export const MAX_TIMESTAMP_MS = 8.64e15;
const timestamp: Check = (v) => finite(v) && Math.abs(v as number) <= MAX_TIMESTAMP_MS;

const oneOf =
  (values: readonly unknown[]): Check =>
  (v) =>
    values.includes(v);
const optional =
  (check: Check): Check =>
  (v) =>
    v === undefined || check(v);
const arrayOf =
  (check: Check): Check =>
  (v) =>
    Array.isArray(v) && v.every(check);

/** Required fields must pass their check; fields absent from the schema are not inspected. */
const shape =
  (fields: Record<string, Check>): Check =>
  (v) =>
    isRecord(v) && Object.entries(fields).every(([key, check]) => check(v[key]));

/** A photo as written by the exporter: `{ __blob: { type: 'image/…', base64 } }`. */
const encodedImage: Check = (v) =>
  isRecord(v) &&
  isRecord(v.__blob) &&
  typeof v.__blob.type === 'string' &&
  v.__blob.type.startsWith('image/') &&
  typeof v.__blob.base64 === 'string';

const per100g = shape({
  kcal: nonNegative,
  protein: nonNegative,
  carbs: nonNegative,
  fat: nonNegative,
  sugars: optional(nonNegative),
  fiber: optional(nonNegative),
});

const macros = shape({
  kcal: finite,
  protein: finite,
  carbs: finite,
  sugars: finite,
  fat: finite,
  fiber: finite,
});

const timestamps = { createdAt: timestamp, updatedAt: timestamp };

const logEntryBase = {
  id,
  date: localDate,
  slot: oneOf(MEAL_SLOTS),
  grams: nonNegative,
  name: text,
  per100g,
  macros,
  ...timestamps,
};

const SCHEMAS: Readonly<Record<string, Check>> = {
  settings: shape({ key: text, value: anything }),
  foods: shape({
    id,
    name: text,
    nameNormalized: text,
    brand: optional(text),
    barcode: optional(text),
    photo: optional(encodedImage),
    per100g,
    favorite: zeroOrOne,
    ...timestamps,
  }),
  meals: shape({
    id,
    name: text,
    nameNormalized: text,
    photo: optional(encodedImage),
    ingredients: arrayOf(shape({ foodId: id, grams: nonNegative })),
    cookedWeight: optional(nonNegative),
    portions: optional(nonNegative),
    favorite: zeroOrOne,
    ...timestamps,
  }),
  goals: shape({
    id: oneOf(['default']),
    kcal: optional(nonNegative),
    protein: optional(nonNegative),
    carbs: optional(nonNegative),
    sugars: optional(nonNegative),
    fat: optional(nonNegative),
    fiber: optional(nonNegative),
  }),
  logEntries: (v) =>
    isRecord(v) &&
    (v.kind === 'food'
      ? shape({ ...logEntryBase, foodId: id, brand: optional(text) })(v)
      : v.kind === 'meal'
        ? shape({ ...logEntryBase, mealId: id, portionGrams: nonNegative, portions: optional(nonNegative) })(
            v,
          )
        : false),
  exercises: shape({
    id,
    name: text,
    nameNormalized: text,
    primaryMuscles: arrayOf((m) => typeof m === 'string' && isMuscleId(m)),
    secondaryMuscles: arrayOf((m) => typeof m === 'string' && isMuscleId(m)),
    equipment: optional(oneOf(EQUIPMENT)),
    isCustom: zeroOrOne,
    seedId: optional(text),
  }),
  workouts: shape({
    id,
    date: localDate,
    status: oneOf(['active', 'done']),
    startedAt: timestamp,
    endedAt: optional(timestamp),
    name: optional(text),
    notes: optional(text),
    templateId: optional(id),
    restEndsAt: optional(timestamp),
  }),
  workoutSets: shape({
    id,
    workoutId: id,
    exerciseId: id,
    order: (v) => Number.isInteger(v) && (v as number) >= 0,
    setNumber: id,
    weightKg: nonNegative,
    reps: (v) => Number.isInteger(v) && (v as number) >= 0,
    completed: bool,
    rpe: optional(finite),
    completedAt: optional(timestamp),
    bodyweight: optional(bool),
  }),
  gymDays: shape({ date: localDate, attended: bool, rest: optional(bool) }),
  templates: shape({
    id,
    name: text,
    exercises: arrayOf(
      shape({
        exerciseId: id,
        targetSets: id,
        targetReps: optional((v) => Number.isInteger(v) && (v as number) > 0),
        sets: optional(
          arrayOf(shape({ weightKg: nonNegative, reps: (v) => Number.isInteger(v) && (v as number) >= 0 })),
        ),
        bodyweight: optional(bool),
      }),
    ),
    ...timestamps,
  }),
  bodyWeights: shape({ id, date: localDate, kg: nonNegative, ...timestamps }),
};

export type RowValidation = { ok: true } | { ok: false; table: string; index: number };

/** Checks every row of every known table; reports the first invalid row. */
export function validateBackupRows(tables: Readonly<Record<string, readonly unknown[]>>): RowValidation {
  for (const [table, rows] of Object.entries(tables)) {
    const check = SCHEMAS[table];
    if (!check) continue;
    const index = rows.findIndex((row) => !check(row));
    if (index !== -1) return { ok: false, table, index };
  }
  return { ok: true };
}

import Dexie, { type EntityTable, type Table } from 'dexie';
import type { LocalDate } from '../domain/date';
import type { Equipment } from '../domain/exercise';
import type { MuscleId } from '../domain/muscles';
import type { Goals, Macros, MealSlot, Per100g, UnloggedStatus } from '../domain/nutrition';
import { latestPerformances, withLatestLoads, type TemplateExercise } from '../domain/workout';
import { normalizeText } from '../domain/search';
import { EXERCISE_SEED } from './exerciseSeed';

/** Key/value store for app-level settings and flags (e.g. persistence requested). */
export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface Food {
  id: number;
  name: string;
  /** `normalizeText(name + brand)`, kept in sync by `saveFood`, used for search. */
  nameNormalized: string;
  brand?: string;
  barcode?: string;
  /** JPEG, max 800 px on the longest side. */
  photo?: Blob;
  per100g: Per100g;
  /** 0 | 1 (IndexedDB cannot index booleans). */
  favorite: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

export interface GoalsRecord extends Goals {
  id: 'default';
  updatedAt: number;
}

export interface MealIngredient {
  /** The product; it may have been deleted since (shown as "produit supprimé"). */
  foodId: number;
  grams: number;
}

/** A saved recipe. Its macros are always derived from the ingredients, never stored. */
export interface Meal {
  id: number;
  name: string;
  nameNormalized: string;
  /** JPEG, max 800 px on the longest side. */
  photo?: Blob;
  /** In display order. */
  ingredients: MealIngredient[];
  /** Weight of the finished dish in grams; the raw ingredient weight is used when unset. */
  cookedWeight?: number;
  /** Number of portions the dish makes; one portion = the whole dish when unset. */
  portions?: number;
  favorite: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

interface LogEntryBase {
  id: number;
  date: LocalDate;
  slot: MealSlot;
  /** Grams eaten (of the food, or of the finished dish). */
  grams: number;
  /** Name of the food or meal at log time. */
  name: string;
  /** Per 100 g of the food, or of the finished dish, at log time. */
  per100g: Per100g;
  /** Unrounded `computeMacros(per100g, grams)`; round only for display. */
  macros: Macros;
  createdAt: number;
  updatedAt: number;
}

export interface FoodLogEntry extends LogEntryBase {
  kind: 'food';
  /** Source food, kept for "recents"; it may no longer exist. */
  foodId: number;
  brand?: string;
}

export interface MealLogEntry extends LogEntryBase {
  kind: 'meal';
  /** Source meal, kept for "recents"; it may no longer exist. */
  mealId: number;
  /** Weight of one portion of the dish at log time. */
  portionGrams: number;
  /** Set when logged by portions (then grams = portions × portionGrams); unset when logged by grams. */
  portions?: number;
}

/**
 * A quick entry, without a product (a restaurant meal…): its calories and macros are typed in
 * directly, so it has no grams nor per-100 g values.
 */
export interface QuickLogEntry extends Omit<LogEntryBase, 'grams' | 'per100g'> {
  kind: 'quick';
}

/**
 * Something eaten on a day. Everything needed to display and edit it is snapshotted at log time,
 * so later edits to (or deletion of) the food, meal or ingredients never rewrite history.
 */
export type LogEntry = FoodLogEntry | MealLogEntry | QuickLogEntry;

/** Entries logged from a product or a meal (they have grams and per-100 g values). */
export type WeighedLogEntry = FoodLogEntry | MealLogEntry;

export interface Exercise {
  id: number;
  name: string;
  nameNormalized: string;
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  equipment?: Equipment;
  /** 0 for the built-in library (read-only), 1 for exercises created by the user. */
  isCustom: 0 | 1;
  /** Stable id of a built-in exercise (see exerciseSeed.ts); absent for custom ones. */
  seedId?: string;
}

export type WorkoutStatus = 'active' | 'done';

export interface Workout {
  id: number;
  /** Day the workout counts for (local). */
  date: LocalDate;
  /** 'active' while being logged (at most one), 'done' once finished or back-filled. */
  status: WorkoutStatus;
  startedAt: number;
  endedAt?: number;
  name?: string;
  templateId?: number;
  notes?: string;
  /** When the current rest period ends (epoch ms); stored so the timer survives reloads. */
  restEndsAt?: number;
  /** The teammate training alongside (their sets are `PartnerSet`s); absent when training alone. */
  partnerId?: number;
}

export interface WorkoutSet {
  id: number;
  workoutId: number;
  exerciseId: number;
  /** Position of the exercise within the workout (all its sets share it). */
  order: number;
  /** 1-based, per exercise. */
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  rpe?: number;
  completedAt?: number;
}

/** A friend you sometimes train with: a name, and their own sets (`PartnerSet`). */
export interface Partner {
  id: number;
  name: string;
  createdAt: number;
}

/**
 * A teammate's set in one of your workouts. Kept apart from `WorkoutSet` so your own records,
 * stats, prefills and templates never see them. They follow your exercise order in the workout,
 * so they carry no `order` of their own.
 */
export interface PartnerSet {
  id: number;
  workoutId: number;
  partnerId: number;
  exerciseId: number;
  /** 1-based, per exercise. */
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  rpe?: number;
  completedAt?: number;
}

/**
 * A line of the shopping list (Alimentation › Courses): a product of the app, or any ingredient
 * typed by hand (no `foodId`). In the shop, what was taken: quantity and price paid.
 */
export interface ShoppingItem {
  id: number;
  name: string;
  /** The product it stands for, when picked from Produits or a dish. */
  foodId?: number;
  /** How much to buy, when known (g). */
  neededG?: number;
  /** Quantity actually taken in the shop (g). */
  boughtG?: number;
  /** Price paid for it, in euro cents. */
  priceCents?: number;
  /** Taken (in the basket). */
  checked: boolean;
  createdAt: number;
}

/** Last price paid for a product, per kg, to estimate the next shopping. */
export interface ShoppingPrice {
  /** `food:<id>` for a product of the app, `name:<normalized name>` for a hand-typed one. */
  key: string;
  centsPerKg: number;
  updatedAt: number;
}

/**
 * Manual marks for a day: attended (a gym day without a logged workout) or a planned rest day.
 * The two are exclusive. A day with a workout counts as attended regardless, and is never a rest
 * day. `rest` is optional and not indexed, so rows written before it existed stay valid.
 */
export interface GymDay {
  date: LocalDate;
  attended: boolean;
  rest?: boolean;
}

/**
 * A day whose meals weren't counted (or only partly): what the user knows about it instead.
 * It takes precedence over that day's log entries in every nutrition stat.
 */
export interface NutritionDay {
  date: LocalDate;
  status: UnloggedStatus;
  updatedAt: number;
}

export interface Template {
  id: number;
  name: string;
  exercises: TemplateExercise[];
  createdAt: number;
  updatedAt: number;
}

/** One weigh-in per day (the date is unique; saving again replaces it). */
export interface BodyWeightEntry {
  id: number;
  date: LocalDate;
  /** 0.1 kg precision. */
  kg: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Built-ins are read-only, so their names always come from the seed: after renaming one in
 * EXERCISE_SEED, a schema upgrade calls this to rename it in existing databases (ids, and so
 * every workout and template using it, are kept).
 */
export async function syncBuiltInNames(table: Table<Exercise, number>): Promise<void> {
  const names = new Map(EXERCISE_SEED.map((e) => [e.seedId, e.name]));
  await table.toCollection().modify((exercise) => {
    const name = exercise.seedId === undefined ? undefined : names.get(exercise.seedId);
    if (name === undefined || name === exercise.name) return;
    exercise.name = name;
    exercise.nameNormalized = normalizeText(name);
  });
}

/**
 * Built-ins are read-only, so their muscles always come from the seed too: after changing them in
 * EXERCISE_SEED, a schema upgrade calls this (custom exercises are never touched).
 */
export async function syncBuiltInMuscles(table: Table<Exercise, number>): Promise<void> {
  const seeds = new Map(EXERCISE_SEED.map((e) => [e.seedId, e]));
  await table.toCollection().modify((exercise) => {
    const seed = exercise.seedId === undefined ? undefined : seeds.get(exercise.seedId);
    if (!seed) return;
    exercise.primaryMuscles = [...seed.primaryMuscles];
    exercise.secondaryMuscles = [...seed.secondaryMuscles];
  });
}

/** Inserts built-in exercises that are not in the table yet (matched by seedId). */
export async function seedExercises(table: Table<Omit<Exercise, 'id'>, number>): Promise<void> {
  const existing = new Set((await table.toArray()).map((e) => e.seedId).filter(Boolean));
  const missing = EXERCISE_SEED.filter((e) => !existing.has(e.seedId));
  await table.bulkAdd(
    missing.map((e) => ({
      seedId: e.seedId,
      name: e.name,
      nameNormalized: normalizeText(e.name),
      primaryMuscles: e.primaryMuscles,
      secondaryMuscles: e.secondaryMuscles,
      equipment: e.equipment,
      isCustom: 0,
    })),
  );
}

export class PrimeDB extends Dexie {
  settings!: EntityTable<Setting, 'key'>;
  foods!: EntityTable<Food, 'id'>;
  meals!: EntityTable<Meal, 'id'>;
  goals!: EntityTable<GoalsRecord, 'id'>;
  logEntries!: EntityTable<LogEntry, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  workoutSets!: EntityTable<WorkoutSet, 'id'>;
  gymDays!: EntityTable<GymDay, 'date'>;
  templates!: EntityTable<Template, 'id'>;
  bodyWeights!: EntityTable<BodyWeightEntry, 'id'>;
  nutritionDays!: EntityTable<NutritionDay, 'date'>;
  partners!: EntityTable<Partner, 'id'>;
  partnerSets!: EntityTable<PartnerSet, 'id'>;
  shoppingItems!: EntityTable<ShoppingItem, 'id'>;
  shoppingPrices!: EntityTable<ShoppingPrice, 'key'>;

  constructor(name = 'prime') {
    super(name);

    // Schema history. NEVER edit a published version: add a new `this.version(n + 1)` with
    // the full store list and, if data must change, an `.upgrade(tx => ...)` migration.
    this.version(1).stores({
      settings: 'key',
    });

    // v2: nutrition (purely additive, no data migration needed).
    this.version(2).stores({
      settings: 'key',
      foods: '++id, nameNormalized, barcode, createdAt',
      goals: 'id',
      logEntries: '++id, date, foodId, createdAt',
    });

    // v3: saved meals; log entries gain `kind` and generic `name`/`brand` snapshot fields.
    this.version(3)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
      })
      .upgrade((tx) =>
        tx
          .table('logEntries')
          .toCollection()
          .modify((entry: Record<string, unknown>) => {
            entry.kind = 'food';
            entry.name = entry.foodName;
            if (entry.foodBrand !== undefined) entry.brand = entry.foodBrand;
            delete entry.foodName;
            delete entry.foodBrand;
          }),
      );

    // v4: gym. Built-in exercises are inserted on upgrade (existing installs) and on populate (new ones).
    this.version(4)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
        exercises: '++id, &seedId, nameNormalized, isCustom',
        workouts: '++id, date, status, startedAt, templateId',
        workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
        gymDays: 'date',
        templates: '++id, name',
      })
      .upgrade((tx) => seedExercises(tx.table('exercises')));

    // v5: body weight (additive).
    this.version(5).stores({
      settings: 'key',
      foods: '++id, nameNormalized, barcode, createdAt',
      meals: '++id, nameNormalized, createdAt',
      goals: 'id',
      logEntries: '++id, date, foodId, mealId, createdAt',
      exercises: '++id, &seedId, nameNormalized, isCustom',
      workouts: '++id, date, status, startedAt, templateId',
      workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
      gymDays: 'date',
      templates: '++id, name',
      bodyWeights: '++id, &date',
    });

    // v6: built-in names follow the seed ("Développé couché (barre)" became "Bench").
    this.version(6)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
        exercises: '++id, &seedId, nameNormalized, isCustom',
        workouts: '++id, date, status, startedAt, templateId',
        workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
        gymDays: 'date',
        templates: '++id, name',
        bodyWeights: '++id, &date',
      })
      .upgrade((tx) => syncBuiltInNames(tx.table('exercises')));

    // v7: built-in muscles reviewed against the body map (deadlift + lats, crunch + obliques).
    this.version(7)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
        exercises: '++id, &seedId, nameNormalized, isCustom',
        workouts: '++id, date, status, startedAt, templateId',
        workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
        gymDays: 'date',
        templates: '++id, name',
        bodyWeights: '++id, &date',
      })
      .upgrade((tx) => syncBuiltInMuscles(tx.table('exercises')));

    // v8: days whose meals weren't counted (under or over the goal). Short-lived builds marked
    // them as a "jour rouge" on the gym day (`red`): those become "over" and lose the flag.
    this.version(8)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
        exercises: '++id, &seedId, nameNormalized, isCustom',
        workouts: '++id, date, status, startedAt, templateId',
        workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
        gymDays: 'date',
        templates: '++id, name',
        bodyWeights: '++id, &date',
        nutritionDays: 'date',
      })
      .upgrade(async (tx) => {
        const red: string[] = [];
        await tx
          .table('gymDays')
          .toCollection()
          .modify((day: Record<string, unknown>) => {
            if (day.red === true && typeof day.date === 'string') red.push(day.date);
            delete day.red;
          });
        const now = Date.now();
        await tx
          .table('nutritionDays')
          .bulkPut(red.map((date) => ({ date, status: 'over', updatedAt: now })));
      });

    // v9: new built-in exercise (single-arm cable triceps pushdown).
    this.version(9)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
        exercises: '++id, &seedId, nameNormalized, isCustom',
        workouts: '++id, date, status, startedAt, templateId',
        workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
        gymDays: 'date',
        templates: '++id, name',
        bodyWeights: '++id, &date',
        nutritionDays: 'date',
      })
      .upgrade((tx) => seedExercises(tx.table('exercises')));

    // v10: loads and reps follow the exercise: templates holding the same exercise take its latest
    // performance (they used to keep the numbers of the last session done from each template).
    this.version(10)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
        exercises: '++id, &seedId, nameNormalized, isCustom',
        workouts: '++id, date, status, startedAt, templateId',
        workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
        gymDays: 'date',
        templates: '++id, name',
        bodyWeights: '++id, &date',
        nutritionDays: 'date',
      })
      .upgrade(async (tx) => {
        const workouts = (await tx.table<Workout, number>('workouts').toArray()).filter(
          (w) => w.status === 'done',
        );
        const done = new Set(workouts.map((w) => w.id));
        const sets = (await tx.table<WorkoutSet, number>('workoutSets').toArray()).filter((s) =>
          done.has(s.workoutId),
        );
        const latest = latestPerformances(
          workouts.map((w) => ({
            workoutId: w.id,
            startedAt: w.startedAt,
            sets: sets.filter((s) => s.workoutId === w.id),
          })),
        );
        const templates = tx.table<Template, number>('templates');
        for (const template of await templates.toArray()) {
          const exercises = withLatestLoads(template.exercises, latest);
          if (exercises) await templates.update(template.id, { exercises });
        }
      });

    // v11: teammates and their sets.
    this.version(11).stores({
      settings: 'key',
      foods: '++id, nameNormalized, barcode, createdAt',
      meals: '++id, nameNormalized, createdAt',
      goals: 'id',
      logEntries: '++id, date, foodId, mealId, createdAt',
      exercises: '++id, &seedId, nameNormalized, isCustom',
      workouts: '++id, date, status, startedAt, templateId',
      workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
      gymDays: 'date',
      templates: '++id, name',
      bodyWeights: '++id, &date',
      nutritionDays: 'date',
      partners: '++id, name',
      partnerSets: '++id, workoutId, partnerId, [partnerId+exerciseId]',
    });

    // v12: shopping list and the prices paid.
    this.version(12).stores({
      settings: 'key',
      foods: '++id, nameNormalized, barcode, createdAt',
      meals: '++id, nameNormalized, createdAt',
      goals: 'id',
      logEntries: '++id, date, foodId, mealId, createdAt',
      exercises: '++id, &seedId, nameNormalized, isCustom',
      workouts: '++id, date, status, startedAt, templateId',
      workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
      gymDays: 'date',
      templates: '++id, name',
      bodyWeights: '++id, &date',
      nutritionDays: 'date',
      partners: '++id, name',
      partnerSets: '++id, workoutId, partnerId, [partnerId+exerciseId]',
      shoppingItems: '++id, createdAt',
      shoppingPrices: 'key',
    });

    // v13: new built-in exercises (power clean, snatch), followed in Stats › Records.
    this.version(13)
      .stores({
        settings: 'key',
        foods: '++id, nameNormalized, barcode, createdAt',
        meals: '++id, nameNormalized, createdAt',
        goals: 'id',
        logEntries: '++id, date, foodId, mealId, createdAt',
        exercises: '++id, &seedId, nameNormalized, isCustom',
        workouts: '++id, date, status, startedAt, templateId',
        workoutSets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
        gymDays: 'date',
        templates: '++id, name',
        bodyWeights: '++id, &date',
        nutritionDays: 'date',
        partners: '++id, name',
        partnerSets: '++id, workoutId, partnerId, [partnerId+exerciseId]',
        shoppingItems: '++id, createdAt',
        shoppingPrices: 'key',
      })
      .upgrade((tx) => seedExercises(tx.table('exercises')));

    this.on('populate', (tx) => seedExercises(tx.table('exercises')));
  }
}

export const db = new PrimeDB();

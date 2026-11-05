import { duplicateName } from '../domain/meal';
import type { TemplateExercise } from '../domain/workout';
import { db, type PrimeDB, type Template } from './db';

export interface TemplateInput {
  name: string;
  exercises: TemplateExercise[];
}

export async function listTemplates(database: PrimeDB = db): Promise<Template[]> {
  const templates = await database.templates.toArray();
  return templates.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function getTemplate(id: number, database: PrimeDB = db): Promise<Template | undefined> {
  return database.templates.get(id);
}

const clean = (input: TemplateInput) => ({
  name: input.name.trim(),
  exercises: input.exercises.map(({ exerciseId, targetSets, targetReps, sets }) => ({
    exerciseId,
    targetSets,
    ...(targetReps !== undefined && { targetReps }),
    ...(sets && { sets: sets.map(({ weightKg, reps }) => ({ weightKg, reps })) }),
  })),
});

export async function createTemplate(input: TemplateInput, database: PrimeDB = db): Promise<number> {
  const now = Date.now();
  return database.templates.add({ ...clean(input), createdAt: now, updatedAt: now });
}

export async function updateTemplate(
  id: number,
  input: TemplateInput,
  database: PrimeDB = db,
): Promise<void> {
  await database.templates.update(id, { ...clean(input), updatedAt: Date.now() });
}

/** Deletes a template. Workouts started from it keep their sets (only the link is lost). */
export async function deleteTemplate(id: number, database: PrimeDB = db): Promise<void> {
  await database.templates.delete(id);
}

export async function duplicateTemplate(id: number, database: PrimeDB = db): Promise<number> {
  return database.transaction('rw', database.templates, async () => {
    const template = await database.templates.get(id);
    if (!template) throw new Error(`Template ${id} not found`);
    const names = (await database.templates.toArray()).map((t) => t.name);
    return createTemplate(
      { name: duplicateName(template.name, names), exercises: template.exercises },
      database,
    );
  });
}

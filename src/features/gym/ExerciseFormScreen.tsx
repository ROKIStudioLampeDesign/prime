import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useGoBack } from '../../components/useGoBack';
import type { Exercise } from '../../db/db';
import {
  createExercise,
  deleteExercise,
  exerciseUsage,
  getExercise,
  updateExercise,
} from '../../db/exercises';
import { EQUIPMENT, EQUIPMENT_LABELS, type Equipment } from '../../domain/exercise';
import { validateMuscleSelection, type MuscleId } from '../../domain/muscles';
import { MusclePicker } from './MusclePicker';

/** /gym/exercises/new and /gym/exercises/:id (built-in exercises are read-only). */
export function ExerciseFormScreen() {
  const { id } = useParams();
  const exerciseId = id === undefined ? undefined : Number(id);
  const exercise = useLiveQuery(
    async () => (exerciseId === undefined ? null : ((await getExercise(exerciseId)) ?? null)),
    [exerciseId],
  );

  // A result for another id is stale (useLiveQuery keeps the previous value while reloading).
  const stale = exercise != null && exercise.id !== exerciseId;
  if (stale || (exerciseId !== undefined && exercise === undefined)) {
    return (
      <Screen title="Exercice" back backFallback="/gym/exercises">
        <Loading />
      </Screen>
    );
  }
  if (exerciseId !== undefined && exercise === null) {
    return (
      <Screen title="Exercice" back backFallback="/gym/exercises">
        <EmptyState title="Exercice introuvable" />
      </Screen>
    );
  }
  return <ExerciseForm key={exercise?.id ?? 'new'} exercise={exercise ?? undefined} />;
}

function ExerciseForm({ exercise }: { exercise?: Exercise }) {
  const goBack = useGoBack('/gym/exercises');
  const readOnly = exercise !== undefined && exercise.isCustom !== 1;
  const [name, setName] = useState(exercise?.name ?? '');
  const [equipment, setEquipment] = useState<Equipment | undefined>(exercise?.equipment);
  const [primary, setPrimary] = useState<MuscleId[]>(exercise?.primaryMuscles ?? []);
  const [secondary, setSecondary] = useState<MuscleId[]>(exercise?.secondaryMuscles ?? []);
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const usage = useLiveQuery(async () => (exercise ? exerciseUsage(exercise.id) : undefined), [exercise?.id]);

  const nameError = name.trim() === '' ? 'Obligatoire' : undefined;
  const muscleErrors = validateMuscleSelection(primary, secondary);
  const valid = !nameError && !muscleErrors.primary && !muscleErrors.overlap;
  const inUse = usage !== undefined && (usage.workouts > 0 || usage.templates > 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!valid || readOnly) return;
    const def = { name, equipment, primaryMuscles: primary, secondaryMuscles: secondary };
    if (exercise) await updateExercise(exercise.id, def);
    else await createExercise(def);
    goBack();
  }

  return (
    <Screen
      title={readOnly ? 'Exercice' : exercise ? 'Modifier l’exercice' : 'Nouvel exercice'}
      back
      backFallback="/gym/exercises"
    >
      {readOnly && (
        <p className="mb-4 rounded-xl bg-surface px-3 py-2 text-sm text-muted">
          Exercice de la bibliothèque : il n’est pas modifiable. Crée un exercice personnalisé si besoin.
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          label="Nom"
          value={name}
          disabled={readOnly}
          onChange={(e) => setName(e.target.value)}
          error={submitted ? nameError : undefined}
        />

        <fieldset disabled={readOnly}>
          <legend className="mb-2 text-sm text-muted">Équipement</legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((eq) => (
              <button
                key={eq}
                type="button"
                aria-pressed={equipment === eq}
                onClick={() => setEquipment(equipment === eq ? undefined : eq)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${
                  equipment === eq ? 'bg-accent-fill text-accent-fg' : 'bg-surface text-muted'
                }`}
              >
                {EQUIPMENT_LABELS[eq]}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <h2 className="mb-2 text-sm text-muted">Muscles sollicités</h2>
          <MusclePicker
            primary={primary}
            secondary={secondary}
            disabled={readOnly}
            onChange={(p, s) => {
              setPrimary(p);
              setSecondary(s);
            }}
          />
          {submitted && muscleErrors.primary && (
            <p className="mt-2 text-xs text-danger">Choisis au moins un muscle principal.</p>
          )}
        </div>

        {!readOnly && (
          <Button type="submit" disabled={submitted && !valid}>
            {exercise ? 'Enregistrer' : 'Créer l’exercice'}
          </Button>
        )}
        {exercise && !readOnly && (
          <>
            <Button
              variant="danger"
              disabled={usage === undefined || inUse}
              onClick={() => setConfirmDelete(true)}
            >
              Supprimer l’exercice
            </Button>
            {inUse && usage && (
              <p className="-mt-3 text-center text-xs text-muted">
                Utilisé dans {usage.workouts} séance{usage.workouts > 1 ? 's' : ''} et {usage.templates}{' '}
                modèle
                {usage.templates > 1 ? 's' : ''} : il ne peut pas être supprimé pour préserver ton historique.
              </p>
            )}
          </>
        )}
      </form>

      <ConfirmSheet
        open={confirmDelete}
        title={`Supprimer « ${exercise?.name ?? ''} » ?`}
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (!exercise) return;
          setConfirmDelete(false);
          await deleteExercise(exercise.id);
          goBack();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

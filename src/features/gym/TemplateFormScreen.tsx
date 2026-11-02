import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { EmptyState } from '../../components/EmptyState';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { NumericInput } from '../../components/NumericInput';
import { iconButton, Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useGoBack } from '../../components/useGoBack';
import type { Exercise, Template } from '../../db/db';
import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  updateTemplate,
} from '../../db/templates';
import { getActiveWorkout, startWorkout } from '../../db/workouts';
import { moveItem } from '../../domain/meal';
import { ExerciseList } from './ExerciseList';
import { exerciseName, musclesLabel, useExercisesById } from './exerciseData';

/** /gym/templates/new and /gym/templates/:id */
export function TemplateFormScreen() {
  const { id } = useParams();
  const templateId = id === undefined ? undefined : Number(id);
  const template = useLiveQuery(
    async () => (templateId === undefined ? null : ((await getTemplate(templateId)) ?? null)),
    [templateId],
  );
  const exercises = useExercisesById();

  // useLiveQuery briefly returns the previous result after the id changes (e.g. after
  // "Dupliquer"): treat a result for another id as still loading.
  const stale = template != null && template.id !== templateId;
  if (exercises === undefined || stale || (templateId !== undefined && template === undefined)) {
    return (
      <Screen title="Modèle" back backFallback="/gym/templates">
        <Loading />
      </Screen>
    );
  }
  if (templateId !== undefined && template === null) {
    return (
      <Screen title="Modèle" back backFallback="/gym/templates">
        <EmptyState title="Modèle introuvable" description="Il a peut-être été supprimé." />
      </Screen>
    );
  }
  return <TemplateForm key={template?.id ?? 'new'} template={template ?? undefined} exercises={exercises} />;
}

interface Row {
  uid: string;
  exerciseId: number;
  targetSets: number;
  /** 0 = no target. */
  targetReps: number;
}

let nextUid = 0;
const newUid = () => `tpl-${++nextUid}`;
const MAX_SETS = 10;

function TemplateForm({ template, exercises }: { template?: Template; exercises: Map<number, Exercise> }) {
  const navigate = useNavigate();
  const goBack = useGoBack('/gym/templates');
  const [name, setName] = useState(template?.name ?? '');
  const [rows, setRows] = useState<Row[]>(
    () =>
      template?.exercises.map((e) => ({
        uid: newUid(),
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps ?? 0,
      })) ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasActive = useLiveQuery(async () => Boolean(await getActiveWorkout()));

  const nameError = name.trim() === '' ? 'Obligatoire' : undefined;
  const valid = !nameError && rows.length > 0;

  const input = () => ({
    name,
    exercises: rows.map((r) => ({
      exerciseId: r.exerciseId,
      targetSets: r.targetSets,
      ...(r.targetReps > 0 && { targetReps: r.targetReps }),
    })),
  });

  async function save(): Promise<number | undefined> {
    setSubmitted(true);
    if (!valid) return undefined;
    if (template) {
      await updateTemplate(template.id, input());
      return template.id;
    }
    return createTemplate(input());
  }

  if (picking) {
    return (
      <Screen title="Ajouter un exercice" back onBack={() => setPicking(false)}>
        <ExerciseList
          exercises={[...exercises.values()]}
          disabledIds={new Set(rows.map((r) => r.exerciseId))}
          disabledHint="Déjà ajouté"
          onSelect={(e) => {
            setRows((rs) => [...rs, { uid: newUid(), exerciseId: e.id, targetSets: 3, targetReps: 0 }]);
            setPicking(false);
          }}
        />
      </Screen>
    );
  }

  const update = (uid: string, changes: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...changes } : r)));

  return (
    <Screen title={template ? 'Modifier le modèle' : 'Nouveau modèle'} back backFallback="/gym/templates">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault();
          if ((await save()) !== undefined) goBack();
        }}
      >
        <TextField
          label="Nom du modèle"
          placeholder="Push, Pull, Jambes…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={submitted ? nameError : undefined}
        />

        <section aria-labelledby="tpl-exercises">
          <h2 id="tpl-exercises" className="mb-2 font-semibold">
            Exercices
          </h2>
          {rows.length === 0 ? (
            <EmptyState title="Aucun exercice" description="Ajoute les exercices de cette séance type." />
          ) : (
            <ol className="flex flex-col gap-2">
              {rows.map((row, index) => {
                const ex = exercises.get(row.exerciseId);
                const label = exerciseName(exercises, row.exerciseId);
                return (
                  <li key={row.uid} className="rounded-2xl bg-surface p-3">
                    <div className="flex items-start gap-1">
                      <div className="min-w-0 flex-1 pt-1 pl-1">
                        <p className="line-clamp-2 leading-snug font-semibold">{label}</p>
                        {ex && (
                          <p className="truncate text-xs text-muted">{musclesLabel(ex.primaryMuscles)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Monter ${label}`}
                        disabled={index === 0}
                        className={`${iconButton} disabled:opacity-30`}
                        onClick={() => setRows((rs) => moveItem(rs, index, index - 1))}
                      >
                        <ArrowUpIcon className="size-5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Descendre ${label}`}
                        disabled={index === rows.length - 1}
                        className={`${iconButton} disabled:opacity-30`}
                        onClick={() => setRows((rs) => moveItem(rs, index, index + 1))}
                      >
                        <ArrowDownIcon className="size-5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Retirer ${label}`}
                        className={iconButton}
                        onClick={() => setRows((rs) => rs.filter((r) => r.uid !== row.uid))}
                      >
                        <TrashIcon className="size-5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3 pl-1">
                      <span className="text-sm text-muted">Séries</span>
                      <div className="flex items-center rounded-xl bg-bg">
                        <button
                          type="button"
                          aria-label={`Une série de moins, ${label}`}
                          disabled={row.targetSets <= 1}
                          className="flex size-11 items-center justify-center text-muted disabled:opacity-30"
                          onClick={() => update(row.uid, { targetSets: row.targetSets - 1 })}
                        >
                          <MinusIcon className="size-4" />
                        </button>
                        <span className="w-6 text-center font-semibold tabular-nums">{row.targetSets}</span>
                        <button
                          type="button"
                          aria-label={`Une série de plus, ${label}`}
                          disabled={row.targetSets >= MAX_SETS}
                          className="flex size-11 items-center justify-center text-muted disabled:opacity-30"
                          onClick={() => update(row.uid, { targetSets: row.targetSets + 1 })}
                        >
                          <PlusIcon className="size-4" />
                        </button>
                      </div>
                      <span className="ml-auto text-sm text-muted">Reps</span>
                      <NumericInput
                        integer
                        aria-label={`Répétitions visées, ${label}`}
                        value={row.targetReps}
                        onCommit={(targetReps) => update(row.uid, { targetReps })}
                        className="h-11 w-16 rounded-xl bg-bg text-center text-base font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {submitted && rows.length === 0 && (
            <p className="mt-2 text-xs text-danger">Ajoute au moins un exercice.</p>
          )}
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setPicking(true)}>
            <PlusIcon className="size-5" /> Ajouter un exercice
          </Button>
        </section>

        <Button type="submit" className="mt-2" disabled={submitted && !valid}>
          {template ? 'Enregistrer' : 'Créer le modèle'}
        </Button>
        {template && (
          <>
            <Button
              variant="secondary"
              onClick={async () => {
                const savedId = await save();
                if (savedId === undefined) return;
                const workoutId = await startWorkout(savedId);
                void navigate(`/gym/workout/${workoutId}`);
              }}
            >
              {hasActive ? 'Reprendre la séance en cours' : 'Commencer cette séance'}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  const copyId = await duplicateTemplate(template.id);
                  void navigate(`/gym/templates/${copyId}`, { replace: true });
                }}
              >
                Dupliquer
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            </div>
          </>
        )}
      </form>

      <ConfirmSheet
        open={confirmDelete}
        title={`Supprimer « ${template?.name ?? ''} » ?`}
        message="Les séances déjà faites avec ce modèle sont conservées."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (!template) return;
          setConfirmDelete(false);
          goBack();
          await deleteTemplate(template.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

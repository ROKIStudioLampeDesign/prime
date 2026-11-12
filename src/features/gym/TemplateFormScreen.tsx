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
import type { TemplateExercise, TemplateSet } from '../../domain/workout';
import { ExerciseList } from './ExerciseList';
import { exerciseName, musclesLabel, useExercisesById } from './exerciseData';

const setInput =
  'h-11 w-full min-w-0 bg-bg text-center text-lg font-black tabular-nums outline-none placeholder:text-muted focus:ring-2 focus:ring-accent focus:ring-inset';
const setButton =
  'flex min-h-11 items-center justify-center gap-1.5 border-2 border-line text-sm font-extrabold active:bg-surface-2 disabled:opacity-30';

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
  /** One entry per set: 0 kg with reps = bodyweight; an empty set = "as last time". */
  sets: TemplateSet[];
}

let nextUid = 0;
const newUid = () => `tpl-${++nextUid}`;
const MAX_SETS = 10;
const EMPTY_SET: TemplateSet = { weightKg: 0, reps: 0 };

/** Templates saved before per-set plans only have a set count and target reps. */
const planOf = (e: TemplateExercise): TemplateSet[] =>
  e.sets && e.sets.length > 0
    ? e.sets
    : Array.from({ length: e.targetSets }, () => ({ weightKg: 0, reps: e.targetReps ?? 0 }));

function TemplateForm({ template, exercises }: { template?: Template; exercises: Map<number, Exercise> }) {
  const navigate = useNavigate();
  const goBack = useGoBack('/gym/templates');
  const [name, setName] = useState(template?.name ?? '');
  const [rows, setRows] = useState<Row[]>(
    () =>
      template?.exercises.map((e) => ({ uid: newUid(), exerciseId: e.exerciseId, sets: planOf(e) })) ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasActive = useLiveQuery(async () => Boolean(await getActiveWorkout()));

  const nameError = name.trim() === '' ? 'Obligatoire' : undefined;
  const valid = !nameError && rows.length > 0;

  const input = () => ({
    name,
    exercises: rows.map((r) => {
      const lastReps = r.sets.at(-1)?.reps ?? 0;
      return {
        exerciseId: r.exerciseId,
        targetSets: r.sets.length,
        ...(lastReps > 0 && { targetReps: lastReps }),
        sets: r.sets,
      };
    }),
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
            setRows((rs) => [
              ...rs,
              { uid: newUid(), exerciseId: e.id, sets: [EMPTY_SET, EMPTY_SET, EMPTY_SET] },
            ]);
            setPicking(false);
          }}
        />
      </Screen>
    );
  }

  const setSets = (uid: string, change: (sets: TemplateSet[]) => TemplateSet[]) =>
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, sets: change(r.sets) } : r)));
  const updateSet = (uid: string, index: number, changes: Partial<TemplateSet>) =>
    setSets(uid, (sets) => sets.map((s, i) => (i === index ? { ...s, ...changes } : s)));

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
          <h2 id="tpl-exercises" className="text-[1.375rem] leading-tight headline">
            Exercices
          </h2>
          <p className="mt-1 mb-3 text-sm font-semibold text-muted">
            Les séries de chaque exercice, avec leur charge et leurs répétitions. Une charge vide ou à 0 avec
            des reps = poids du corps ; une série vide reprend ta dernière séance. Les charges et reps suivent
            l’exercice : après chaque séance, tous les modèles qui le contiennent reprennent tes derniers
            chiffres.
          </p>
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
                    <div
                      aria-hidden="true"
                      className="mt-3 grid grid-cols-[2.75rem_1fr_1fr] gap-2 text-xs font-extrabold text-muted"
                    >
                      <span className="text-center">Série</span>
                      <span className="text-center">kg</span>
                      <span className="text-center">Reps</span>
                    </div>
                    <ol className="mt-1 flex flex-col gap-1">
                      {row.sets.map((set, i) => (
                        <li key={i} className="grid grid-cols-[2.75rem_1fr_1fr] items-center gap-2">
                          <span className="text-center text-[17px] font-black tabular-nums">{i + 1}</span>
                          <NumericInput
                            aria-label={`Poids en kg, série ${i + 1}, ${label}`}
                            placeholder={set.reps > 0 ? 'PDC' : '—'}
                            value={set.weightKg}
                            onCommit={(weightKg) => updateSet(row.uid, i, { weightKg })}
                            className={setInput}
                          />
                          <NumericInput
                            integer
                            aria-label={`Répétitions, série ${i + 1}, ${label}`}
                            placeholder="—"
                            value={set.reps}
                            onCommit={(reps) => updateSet(row.uid, i, { reps })}
                            className={setInput}
                          />
                        </li>
                      ))}
                    </ol>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-label={`Retirer la dernière série, ${label}`}
                        disabled={row.sets.length <= 1}
                        className={setButton}
                        onClick={() => setSets(row.uid, (sets) => sets.slice(0, -1))}
                      >
                        <MinusIcon className="size-4" strokeWidth={2.8} /> Série
                      </button>
                      <button
                        type="button"
                        aria-label={`Ajouter une série, ${label}`}
                        disabled={row.sets.length >= MAX_SETS}
                        className={setButton}
                        onClick={() => setSets(row.uid, (sets) => [...sets, sets.at(-1) ?? EMPTY_SET])}
                      >
                        <PlusIcon className="size-4" strokeWidth={2.8} /> Série
                      </button>
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

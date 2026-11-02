import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { EmptyState } from '../../components/EmptyState';
import { PlusIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useNow } from '../../components/useNow';
import { useWakeLock } from '../../components/useWakeLock';
import type { Workout, WorkoutSet } from '../../db/db';
import { getRestSeconds } from '../../db/gymDays';
import {
  addExerciseToWorkout,
  deleteWorkout,
  finishWorkout,
  getWorkout,
  getWorkoutSets,
  updateWorkoutMeta,
} from '../../db/workouts';
import { isLocalDate } from '../../domain/date';
import { workoutStats } from '../../domain/workout';
import { formatDuration, formatVolume } from '../../lib/format';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseList } from './ExerciseList';
import { RestTimerBar } from './RestTimerBar';
import { SaveTemplateSheet } from './SaveTemplateSheet';
import { useExercisesById } from './exerciseData';
import { workoutTitle } from './workoutLabels';

/** /gym/workout/:id — logging an active workout, or editing a finished one. */
export function WorkoutScreen() {
  const workoutId = Number(useParams().id);
  const navigate = useNavigate();
  const workout = useLiveQuery(async () => (await getWorkout(workoutId)) ?? null, [workoutId]);
  const sets = useLiveQuery(() => getWorkoutSets(workoutId), [workoutId]);
  const exercises = useExercisesById();
  const restSeconds = useLiveQuery(getRestSeconds);
  const [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState<'finish' | 'abandon' | 'delete'>();
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const active = workout?.status === 'active';
  useWakeLock(active);
  const now = useNow(15_000, active);

  const groups = useMemo(() => {
    const byExercise = new Map<number, WorkoutSet[]>();
    for (const s of sets ?? []) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
    return [...byExercise.entries()].map(([exerciseId, exSets]) => ({ exerciseId, sets: exSets }));
  }, [sets]);

  if (workout === undefined || sets === undefined || exercises === undefined || restSeconds === undefined) {
    return (
      <Screen title="Séance" back backFallback="/gym">
        <Loading />
      </Screen>
    );
  }
  if (workout === null) {
    return (
      <Screen title="Séance" back backFallback="/gym">
        <EmptyState title="Séance introuvable" description="Elle a peut-être été supprimée." />
      </Screen>
    );
  }

  if (picking) {
    return (
      <Screen title="Ajouter un exercice" back onBack={() => setPicking(false)}>
        <ExerciseList
          exercises={[...exercises.values()]}
          disabledIds={new Set(groups.map((g) => g.exerciseId))}
          disabledHint="Déjà ajouté"
          onSelect={async (exercise) => {
            await addExerciseToWorkout(workout.id, exercise.id);
            setPicking(false);
          }}
        />
      </Screen>
    );
  }

  const stats = workoutStats(workout, sets, active ? now : undefined);
  const pending = sets.length - stats.completedSets;

  async function finish() {
    setConfirm(undefined);
    await finishWorkout(workoutId);
    void navigate(`/gym/workout/${workoutId}/summary`, { replace: true });
  }

  function requestFinish() {
    if (stats.completedSets === 0) setConfirm('abandon');
    else if (pending > 0) setConfirm('finish');
    else void finish();
  }

  async function remove() {
    setConfirm(undefined);
    void navigate('/gym', { replace: true });
    await deleteWorkout(workoutId);
  }

  return (
    <Screen
      title={workoutTitle(workout)}
      back
      backFallback="/gym"
      actions={
        active && (
          <button
            type="button"
            onClick={requestFinish}
            className="-mr-1 min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg active:opacity-80"
          >
            Terminer
          </button>
        )
      }
    >
      <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Durée" value={stats.durationMs === undefined ? '—' : formatDuration(stats.durationMs)} />
        <Stat
          label="Séries"
          value={active ? `${stats.completedSets}/${sets.length}` : String(stats.completedSets)}
        />
        <Stat label="Volume" value={formatVolume(stats.volumeKg)} />
      </dl>

      {groups.length === 0 ? (
        <EmptyState
          title="Aucun exercice"
          description="Ajoute un exercice : ses séries seront pré-remplies avec tes charges de la dernière fois."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g, i) => (
            <ExerciseCard
              key={g.exerciseId}
              workout={workout}
              exerciseId={g.exerciseId}
              exercise={exercises.get(g.exerciseId)}
              sets={g.sets}
              isFirst={i === 0}
              isLast={i === groups.length - 1}
              restSeconds={active ? restSeconds : 0}
            />
          ))}
        </div>
      )}

      <Button variant="secondary" className="mt-4 w-full" onClick={() => setPicking(true)}>
        <PlusIcon className="size-5" /> Ajouter un exercice
      </Button>

      <DetailsForm key={workout.id} workout={workout} />

      <div className="mt-6 flex flex-col gap-2">
        {!active && sets.length > 0 && (
          <Button variant="secondary" onClick={() => setSavingTemplate(true)}>
            {templateSaved ? 'Modèle enregistré ✓' : 'Enregistrer comme modèle'}
          </Button>
        )}
        <Button variant="danger" onClick={() => setConfirm(active ? 'abandon' : 'delete')}>
          {active ? 'Abandonner la séance' : 'Supprimer la séance'}
        </Button>
      </div>
      {/* Keeps the last controls clear of the rest timer bar. */}
      <div className="h-24" />

      {active && workout.restEndsAt !== undefined && (
        <RestTimerBar key={workout.restEndsAt} workoutId={workout.id} endsAt={workout.restEndsAt} />
      )}

      <ConfirmSheet
        open={confirm === 'finish'}
        title="Terminer la séance ?"
        message={`${pending} série${pending > 1 ? 's' : ''} non validée${pending > 1 ? 's' : ''} ser${pending > 1 ? 'ont' : 'a'} supprimée${pending > 1 ? 's' : ''}.`}
        confirmLabel="Terminer"
        onConfirm={() => void finish()}
        onCancel={() => setConfirm(undefined)}
      />
      <ConfirmSheet
        open={confirm === 'abandon' || confirm === 'delete'}
        title={confirm === 'abandon' ? 'Abandonner la séance ?' : 'Supprimer la séance ?'}
        message={
          confirm === 'abandon' && stats.completedSets === 0
            ? 'Aucune série n’est validée : la séance sera supprimée.'
            : 'Toutes ses séries seront supprimées. Cette action est définitive.'
        }
        confirmLabel={confirm === 'abandon' ? 'Abandonner' : 'Supprimer'}
        onConfirm={() => void remove()}
        onCancel={() => setConfirm(undefined)}
      />
      <SaveTemplateSheet
        workoutId={workout.id}
        open={savingTemplate}
        defaultName={workout.name ?? 'Ma séance'}
        onClose={() => setSavingTemplate(false)}
        onSaved={() => {
          setSavingTemplate(false);
          setTemplateSaved(true);
        }}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-2 py-2">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="truncate font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Name, notes (and date for finished workouts). Local state saved on blur: binding inputs
 * directly to live-query data would drop keystrokes during the async round-trip.
 */
function DetailsForm({ workout }: { workout: Workout }) {
  const [name, setName] = useState(workout.name ?? '');
  const [notes, setNotes] = useState(workout.notes ?? '');
  return (
    <section className="mt-6 flex flex-col gap-3" aria-label="Détails">
      {workout.status === 'done' && (
        <TextField
          label="Date"
          type="date"
          value={workout.date}
          onChange={(e) => {
            if (isLocalDate(e.target.value)) void updateWorkoutMeta(workout.id, { date: e.target.value });
          }}
        />
      )}
      <TextField
        label="Nom (facultatif)"
        placeholder="Push, Jambes…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => void updateWorkoutMeta(workout.id, { name })}
      />
      <div>
        <label htmlFor="workout-notes" className="mb-1 block text-sm text-muted">
          Notes (facultatif)
        </label>
        <textarea
          id="workout-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void updateWorkoutMeta(workout.id, { notes })}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
        />
      </div>
    </section>
  );
}

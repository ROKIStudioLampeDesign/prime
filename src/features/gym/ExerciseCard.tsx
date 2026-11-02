import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/icons';
import { NumericInput } from '../../components/NumericInput';
import { iconButton } from '../../components/Screen';
import type { Exercise, Workout, WorkoutSet } from '../../db/db';
import {
  addSet,
  getLastPerformance,
  moveExercise,
  removeExercise,
  removeSet,
  setCompleted,
  updateSet,
} from '../../db/workouts';
import { previousForSet, stepWeight, type PerformedSet } from '../../domain/workout';
import { formatWeight } from '../../lib/format';
import { musclesLabel } from './exerciseData';

const STEPS = [2.5, 1.25, 0.5];

interface ExerciseCardProps {
  workout: Workout;
  exerciseId: number;
  /** Undefined if the exercise no longer exists. */
  exercise: Exercise | undefined;
  sets: WorkoutSet[];
  isFirst: boolean;
  isLast: boolean;
  /** Rest started when a set is completed (0 = no timer, e.g. editing a past workout). */
  restSeconds: number;
}

export function ExerciseCard({
  workout,
  exerciseId,
  exercise,
  sets,
  isFirst,
  isLast,
  restSeconds,
}: ExerciseCardProps) {
  const previous = useLiveQuery(
    () => getLastPerformance(exerciseId, { before: workout.startedAt, excludeWorkoutId: workout.id }),
    [exerciseId, workout.startedAt, workout.id],
  );
  const [step, setStep] = useState(STEPS[0] ?? 2.5);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [menuSetId, setMenuSetId] = useState<number>();
  const name = exercise?.name ?? 'Exercice inconnu';
  const menuSet = sets.find((s) => s.id === menuSetId);
  const completedCount = sets.filter((s) => s.completed).length;

  function cycleStep() {
    const i = STEPS.indexOf(step);
    setStep(STEPS[(i + 1) % STEPS.length] ?? 2.5);
  }

  return (
    <section aria-label={name} className="rounded-2xl bg-surface p-3">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1 pt-1 pl-1">
          <h2 className="line-clamp-2 leading-snug font-semibold">{name}</h2>
          {exercise && <p className="truncate text-xs text-muted">{musclesLabel(exercise.primaryMuscles)}</p>}
        </div>
        <button
          type="button"
          aria-label={`Monter ${name}`}
          disabled={isFirst}
          className={`${iconButton} disabled:opacity-30`}
          onClick={() => void moveExercise(workout.id, exerciseId, -1)}
        >
          <ArrowUpIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label={`Descendre ${name}`}
          disabled={isLast}
          className={`${iconButton} disabled:opacity-30`}
          onClick={() => void moveExercise(workout.id, exerciseId, 1)}
        >
          <ArrowDownIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label={`Retirer ${name}`}
          className={iconButton}
          onClick={() =>
            completedCount > 0 ? setConfirmRemove(true) : void removeExercise(workout.id, exerciseId)
          }
        >
          <TrashIcon className="size-5" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
        <span className="w-11 text-center">Série</span>
        <button
          type="button"
          onClick={cycleStep}
          aria-label={`Pas des boutons de poids : ${formatWeight(step)} kg. Changer`}
          className="flex h-8 w-[140px] items-center justify-center gap-1 rounded-lg normal-case active:bg-surface-2"
        >
          kg <span className="rounded bg-surface-2 px-1.5 py-0.5 tabular-nums">±{formatWeight(step)}</span>
        </button>
        <span className="w-14 text-center">Reps</span>
      </div>

      <ol className="mt-1 flex flex-col gap-1">
        {sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            step={step}
            previous={previousForSet(previous, set.setNumber)}
            onToggle={() => void setCompleted(set.id, !set.completed, restSeconds)}
            onMenu={() => setMenuSetId(set.id)}
          />
        ))}
      </ol>

      <Button
        variant="ghost"
        className="mt-1 min-h-11 w-full text-sm"
        onClick={() => void addSet(workout.id, exerciseId)}
      >
        <PlusIcon className="size-4" /> Ajouter une série
      </Button>

      <SetMenu set={menuSet} onClose={() => setMenuSetId(undefined)} />
      <ConfirmSheet
        open={confirmRemove}
        title={`Retirer « ${name} » ?`}
        message={`Ses ${sets.length} séries, dont ${completedCount} validée${completedCount > 1 ? 's' : ''}, seront supprimées de cette séance.`}
        confirmLabel="Retirer l’exercice"
        onConfirm={() => {
          setConfirmRemove(false);
          void removeExercise(workout.id, exerciseId);
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </section>
  );
}

interface SetRowProps {
  set: WorkoutSet;
  step: number;
  previous: PerformedSet | undefined;
  onToggle: () => void;
  onMenu: () => void;
}

function SetRow({ set, step, previous, onToggle, onMenu }: SetRowProps) {
  const label = `série ${set.setNumber}`;
  return (
    <li className={`rounded-xl px-0.5 py-1 ${set.completed ? 'bg-accent/10' : ''}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onMenu}
          aria-label={`Options de la ${label}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg font-semibold text-muted tabular-nums active:bg-surface-2"
        >
          {set.setNumber}
        </button>
        <div className="flex w-[140px] shrink-0 items-center">
          <StepButton
            label={`Retirer ${formatWeight(step)} kg, ${label}`}
            onClick={() => void updateSet(set.id, { weightKg: stepWeight(set.weightKg, -step) })}
          >
            <MinusIcon className="size-4" />
          </StepButton>
          <NumericInput
            aria-label={`Poids en kg, ${label}`}
            value={set.weightKg}
            onCommit={(weightKg) => void updateSet(set.id, { weightKg })}
            className="h-11 w-full min-w-0 rounded-lg bg-bg text-center text-base font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent"
          />
          <StepButton
            label={`Ajouter ${formatWeight(step)} kg, ${label}`}
            onClick={() => void updateSet(set.id, { weightKg: stepWeight(set.weightKg, step) })}
          >
            <PlusIcon className="size-4" />
          </StepButton>
        </div>
        <NumericInput
          integer
          aria-label={`Répétitions, ${label}`}
          value={set.reps}
          onCommit={(reps) => void updateSet(set.id, { reps })}
          className="h-11 w-14 shrink-0 rounded-lg bg-bg text-center text-base font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={set.completed}
          aria-label={set.completed ? `Annuler la validation, ${label}` : `Valider la ${label}`}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 ${
            set.completed
              ? 'border-accent bg-accent text-accent-fg'
              : 'border-line text-muted active:bg-surface-2'
          }`}
        >
          <CheckIcon className="size-5" strokeWidth={2.6} />
        </button>
      </div>
      {(previous || set.rpe !== undefined) && (
        <p className="pl-[50px] text-[11px] text-muted tabular-nums">
          {previous && `Dernière fois : ${formatWeight(previous.weightKg)} kg × ${previous.reps}`}
          {previous && set.rpe !== undefined && ' · '}
          {set.rpe !== undefined && `RPE ${set.rpe}`}
        </p>
      )}
    </li>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-muted active:bg-surface-2 active:text-fg"
    >
      {children}
    </button>
  );
}

const RPE_VALUES = [6, 7, 8, 9, 10];

/** Per-set options: RPE and deletion. */
function SetMenu({ set, onClose }: { set: WorkoutSet | undefined; onClose: () => void }) {
  return (
    <BottomSheet open={set !== undefined} onClose={onClose} title={set ? `Série ${set.setNumber}` : ''}>
      {set && (
        <>
          <p className="mb-2 text-sm text-muted">Difficulté ressentie (RPE, facultatif)</p>
          <div className="grid grid-cols-6 gap-1.5">
            {RPE_VALUES.map((rpe) => (
              <Button
                key={rpe}
                variant={set.rpe === rpe ? 'primary' : 'secondary'}
                className="min-h-11 px-0"
                onClick={() => void updateSet(set.id, { rpe: set.rpe === rpe ? undefined : rpe })}
              >
                {rpe}
              </Button>
            ))}
            <Button
              variant="secondary"
              className="min-h-11 px-0 text-xs"
              disabled={set.rpe === undefined}
              onClick={() => void updateSet(set.id, { rpe: undefined })}
            >
              Aucun
            </Button>
          </div>
          <Button
            variant="danger"
            className="mt-5 w-full"
            onClick={() => {
              onClose();
              void removeSet(set.id);
            }}
          >
            Supprimer la série
          </Button>
        </>
      )}
    </BottomSheet>
  );
}

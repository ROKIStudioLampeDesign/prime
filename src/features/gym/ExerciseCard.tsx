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
import type { Exercise, Partner, PartnerSet, Workout, WorkoutSet } from '../../db/db';
import {
  addPartnerSet,
  getPartnerRecordsBefore,
  removePartnerSet,
  setPartnerSetCompleted,
  updatePartnerSet,
} from '../../db/partners';
import { addSet, moveExercise, removeExercise, removeSet, setCompleted, updateSet } from '../../db/workouts';
import { getRecordsBefore } from '../../db/stats';
import { RECORD_LABELS, sessionRecordHolders, type RecordKind } from '../../domain/strength';
import { setToDrop, stepWeight } from '../../domain/workout';
import { formatWeight } from '../../lib/format';
import { musclesLabel } from './exerciseData';

const STEPS = [2.5, 1.25, 0.5];
/**
 * The PR badge only follows the volume of a set (kg × reps): one badge per exercise at most, on
 * the set that moved the most, rather than one per kind of record on different sets.
 */
const BADGE_KINDS: readonly RecordKind[] = ['volume'];

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
  /** The teammate of the workout and their sets of this exercise, if you train with someone. */
  partner?: { partner: Partner; sets: PartnerSet[] };
}

/** A set as the rows draw it: yours or your teammate's. */
type AnySet = WorkoutSet | PartnerSet;
type SetChanges = Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rpe'>>;

/** What the rows do to a set, for you or for your teammate (their sets live in another table). */
interface SetActions {
  update: (id: number, changes: SetChanges) => void;
  remove: (id: number) => void;
}

const MY_ACTIONS: SetActions = {
  update: (id, changes) => void updateSet(id, changes),
  remove: (id) => void removeSet(id),
};
const PARTNER_ACTIONS: SetActions = {
  update: (id, changes) => void updatePartnerSet(id, changes),
  remove: (id) => void removePartnerSet(id),
};

export function ExerciseCard({
  workout,
  exerciseId,
  exercise,
  sets,
  isFirst,
  isLast,
  restSeconds,
  partner,
}: ExerciseCardProps) {
  // Records from before this workout; only the session's biggest set (kg × reps) gets the badge,
  // and only if it beats the best ever, including the sets already done today.
  const records = useLiveQuery(
    () => getRecordsBefore(exerciseId, workout),
    [exerciseId, workout.id, workout.startedAt],
  );
  const partnerId = partner?.partner.id;
  const partnerRecords = useLiveQuery(
    async () => (partnerId === undefined ? null : getPartnerRecordsBefore(partnerId, exerciseId, workout)),
    [partnerId, exerciseId, workout.id, workout.startedAt],
  );
  const [step, setStep] = useState(STEPS[0] ?? 2.5);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [menuSetId, setMenuSetId] = useState<number>();
  // Whose sets the rows show: yours, or your teammate's (tabs above the rows).
  const [forPartner, setForPartner] = useState(false);
  const mate = forPartner && partner !== undefined;
  const shown: AnySet[] = mate ? partner.sets : sets;
  const actions = mate ? PARTNER_ACTIONS : MY_ACTIONS;
  const name = exercise?.name ?? 'Exercice inconnu';
  const prTarget = workout.prAttempts?.find((a) => a.exerciseId === exerciseId)?.targetKg;
  const menuSet = shown.find((s) => s.id === menuSetId);
  const completedCount = sets.filter((s) => s.completed).length;
  const droppable = setToDrop(shown);
  const shownRecords = mate ? partnerRecords : records;
  const holders = shownRecords ? sessionRecordHolders(shown, shownRecords, BADGE_KINDS) : undefined;

  function toggle(set: AnySet) {
    if (mate) void setPartnerSetCompleted(set.id, !set.completed, restSeconds);
    else void setCompleted(set.id, !set.completed, restSeconds);
  }

  function cycleStep() {
    const i = STEPS.indexOf(step);
    setStep(STEPS[(i + 1) % STEPS.length] ?? 2.5);
  }

  return (
    <section aria-label={name} className="py-4">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1 pt-1">
          {prTarget !== undefined && (
            <p className="mb-1.5 inline-block bg-nutrition px-2 py-0.5 text-[13px] font-black text-ink tabular-nums">
              Tentative PR · {formatWeight(prTarget)} kg
            </p>
          )}
          <h2 className="line-clamp-2 text-[1.3125rem] leading-tight headline">{name}</h2>
          {exercise && (
            <p className="mt-0.5 truncate text-[13px] font-semibold text-muted">
              {musclesLabel(exercise.primaryMuscles)}
            </p>
          )}
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

      {partner && (
        <PersonTabs
          partnerName={partner.partner.name}
          mine={sets}
          theirs={partner.sets}
          forPartner={mate}
          onChange={(value) => {
            setMenuSetId(undefined);
            setForPartner(value);
          }}
        />
      )}

      <div className="mt-3 flex items-center gap-1.5 pl-1 text-xs font-extrabold text-muted">
        <span className="w-11 text-center">Série</span>
        <button
          type="button"
          onClick={cycleStep}
          aria-label={`Pas des boutons de poids : ${formatWeight(step)} kg. Changer`}
          className="flex h-8 w-[140px] items-center justify-center gap-1 normal-case active:bg-surface"
        >
          kg <span className="bg-surface px-1.5 py-0.5 text-fg tabular-nums">±{formatWeight(step)}</span>
        </button>
        <span className="w-14 text-center">Reps</span>
      </div>

      <ol className="mt-1 flex flex-col gap-1">
        {shown.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            step={step}
            mate={mate}
            records={holders?.get(set.id) ?? []}
            onUpdate={(changes) => actions.update(set.id, changes)}
            onToggle={() => toggle(set)}
            onMenu={() => setMenuSetId(set.id)}
          />
        ))}
      </ol>
      {partner && (
        <OtherSummary name={mate ? 'Toi' : partner.partner.name} sets={mate ? sets : partner.sets} />
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={droppable === undefined}
          className="flex min-h-11 items-center justify-center gap-2 border-2 border-line text-[15px] font-extrabold active:bg-surface disabled:opacity-40"
          onClick={() => droppable && actions.remove(droppable.id)}
        >
          <MinusIcon className="size-4" strokeWidth={2.8} /> Retirer une série
        </button>
        <button
          type="button"
          className="flex min-h-11 items-center justify-center gap-2 border-2 border-line text-[15px] font-extrabold active:bg-surface"
          onClick={() => void (mate ? addPartnerSet(workout.id, exerciseId) : addSet(workout.id, exerciseId))}
        >
          <PlusIcon className="size-4" strokeWidth={2.8} /> Ajouter une série
        </button>
      </div>

      <SetMenu set={menuSet} actions={actions} onClose={() => setMenuSetId(undefined)} />
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
  set: AnySet;
  step: number;
  /** A teammate's set: drawn in the Salle colour (the duo's second colour) instead of the accent. */
  mate: boolean;
  /** All-time records this completed set holds (empty: no badge). */
  records: RecordKind[];
  onUpdate: (changes: SetChanges) => void;
  onToggle: () => void;
  onMenu: () => void;
}

function SetRow({ set, step, mate, records, onUpdate, onToggle, onMenu }: SetRowProps) {
  const label = `série ${set.setNumber}`;
  const done = mate
    ? 'border-gym-strong bg-linear-to-r from-gym-strong/30 to-gym-strong/5'
    : 'border-accent bg-linear-to-r from-accent/35 to-accent/5';
  const fill = mate ? 'bg-gym text-on-gym' : 'bg-accent-fill text-accent-fg';
  return (
    <li className={`border-l-4 py-1 pr-0.5 ${set.completed ? done : 'border-transparent'}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onMenu}
          aria-label={`Options de la ${label}`}
          className="flex size-11 shrink-0 items-center justify-center text-[17px] font-black tabular-nums active:bg-surface"
        >
          {set.setNumber}
        </button>
        <div className="flex w-[140px] shrink-0 items-center">
          <StepButton
            label={`Retirer ${formatWeight(step)} kg, ${label}`}
            onClick={() => onUpdate({ weightKg: stepWeight(set.weightKg, -step) })}
          >
            <MinusIcon className="size-4" />
          </StepButton>
          {/* 0 kg = poids du corps: the empty field reads "PDC". */}
          <NumericInput
            aria-label={`Poids en kg, ${label}`}
            placeholder="PDC"
            value={set.weightKg}
            onCommit={(weightKg) => onUpdate({ weightKg })}
            className="h-11 w-full min-w-0 bg-surface text-center text-lg font-black tabular-nums outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
          />
          <StepButton
            label={`Ajouter ${formatWeight(step)} kg, ${label}`}
            onClick={() => onUpdate({ weightKg: stepWeight(set.weightKg, step) })}
          >
            <PlusIcon className="size-4" />
          </StepButton>
        </div>
        <NumericInput
          integer
          aria-label={`Répétitions, ${label}`}
          value={set.reps}
          onCommit={(reps) => onUpdate({ reps })}
          className="h-11 w-14 shrink-0 bg-surface text-center text-lg font-black tabular-nums outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={set.completed}
          aria-label={set.completed ? `Annuler la validation, ${label}` : `Valider la ${label}`}
          className={`flex size-11 shrink-0 items-center justify-center ${
            set.completed ? fill : 'border-2 border-fg active:bg-surface'
          }`}
        >
          <CheckIcon className="size-5" strokeWidth={3} />
        </button>
      </div>
      {(set.rpe !== undefined || records.length > 0) && (
        <p className="flex flex-wrap items-center gap-x-1.5 pl-[50px] text-xs font-semibold text-muted tabular-nums">
          {records.length > 0 && (
            <span
              className={`${fill} px-1.5 py-px text-[11px] font-black`}
              title={records.map((k) => RECORD_LABELS[k]).join(', ')}
              aria-label={`Record all-time : ${records.map((k) => RECORD_LABELS[k]).join(', ')}`}
            >
              PR
            </span>
          )}
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
      className="flex h-11 w-10 shrink-0 items-center justify-center text-muted active:bg-surface active:text-fg"
    >
      {children}
    </button>
  );
}

const RPE_VALUES = [6, 7, 8, 9, 10];

/** Per-set options: RPE and deletion. */
function SetMenu({
  set,
  actions,
  onClose,
}: {
  set: AnySet | undefined;
  actions: SetActions;
  onClose: () => void;
}) {
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
                onClick={() => actions.update(set.id, { rpe: set.rpe === rpe ? undefined : rpe })}
              >
                {rpe}
              </Button>
            ))}
            <Button
              variant="secondary"
              className="min-h-11 px-0 text-xs"
              disabled={set.rpe === undefined}
              onClick={() => actions.update(set.id, { rpe: undefined })}
            >
              Aucun
            </Button>
          </div>
          <Button
            variant="danger"
            className="mt-5 w-full"
            onClick={() => {
              onClose();
              actions.remove(set.id);
            }}
          >
            Supprimer la série
          </Button>
        </>
      )}
    </BottomSheet>
  );
}

/** Toi / teammate switch: whose sets the rows show, with how many each has validated. */
function PersonTabs({
  partnerName,
  mine,
  theirs,
  forPartner,
  onChange,
}: {
  partnerName: string;
  mine: readonly AnySet[];
  theirs: readonly AnySet[];
  forPartner: boolean;
  onChange: (forPartner: boolean) => void;
}) {
  const tab = (label: string, sets: readonly AnySet[], value: boolean, fill: string) => {
    const selected = forPartner === value;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={selected}
        onClick={() => onChange(value)}
        className={`flex min-h-11 min-w-0 items-center justify-center gap-2 px-2 text-[15px] font-black ${
          selected ? fill : 'active:bg-surface'
        }`}
      >
        <span className="truncate">{label}</span>
        <span
          className={`shrink-0 text-xs font-extrabold tabular-nums ${selected ? 'opacity-70' : 'text-muted'}`}
        >
          {sets.filter((s) => s.completed).length}/{sets.length}
        </span>
      </button>
    );
  };
  return (
    <div role="tablist" aria-label="Séries de" className="mt-3 grid grid-cols-2 border-2 border-fg">
      {tab('Toi', mine, false, 'bg-accent-fill text-accent-fg')}
      {tab(partnerName, theirs, true, 'bg-gym text-on-gym')}
    </div>
  );
}

/** One line for the person not shown: their sets as kg × reps, validated ones brighter. */
function OtherSummary({ name, sets }: { name: string; sets: readonly AnySet[] }) {
  if (sets.length === 0) return null;
  return (
    <p className="mt-2 text-[13px] font-semibold text-muted tabular-nums">
      {name} :{' '}
      {sets.map((s, i) => (
        <span key={s.id} className={s.completed ? 'text-fg' : undefined}>
          {i > 0 && ' · '}
          {s.weightKg > 0 ? formatWeight(s.weightKg) : 'PDC'} × {s.reps}
        </span>
      ))}
    </p>
  );
}

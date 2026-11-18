import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import type { Exercise, WorkoutSet } from '../../db/db';
import { getBestKg } from '../../db/stats';
import { addPrAttempt } from '../../db/workouts';
import {
  defaultPrTarget,
  LIFT_IDS,
  prAttemptPlan,
  prAttemptSetsAfter,
  TRACKED_LIFTS,
  type LiftId,
} from '../../domain/lifts';
import { parseDecimal } from '../../domain/number';
import { formatWeight } from '../../lib/format';

const MIN_PR_KG = 20;
const MAX_PR_KG = 400;

interface PrAttemptSheetProps {
  open: boolean;
  onClose: () => void;
  workoutId: number;
  sets: readonly WorkoutSet[];
  exercises: ReadonlyMap<number, Exercise>;
}

/** "Tentative PR": a lift and a load for 1 rep, added to the workout with its warm-up ramp. */
export function PrAttemptSheet({ open, onClose, ...rest }: PrAttemptSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Tentative PR">
      {open && <PrAttemptForm onClose={onClose} {...rest} />}
    </BottomSheet>
  );
}

function PrAttemptForm({ onClose, workoutId, sets, exercises }: Omit<PrAttemptSheetProps, 'open'>) {
  const [lift, setLift] = useState<LiftId>('bench');
  const [text, setText] = useState<string>();
  const exercise = [...exercises.values()].find((e) => e.seedId === TRACKED_LIFTS[lift].seedId);
  const best = useLiveQuery(async () => (exercise ? getBestKg(exercise.id) : 0), [exercise?.id]);

  // Validated sets of this lift in the workout already count as warm-up.
  const own = sets.filter((s) => s.exerciseId === exercise?.id);
  const warmKg = own.reduce((max, s) => (s.completed && s.reps > 0 ? Math.max(max, s.weightKg) : max), 0);
  // Best + 2.5 kg by default; empty without history (no point aiming at the empty bar).
  const value = text ?? (best === undefined || best === 0 ? '' : formatWeight(defaultPrTarget(best)));
  const parsed = parseDecimal(value);
  const target = parsed !== undefined && parsed >= MIN_PR_KG && parsed <= MAX_PR_KG ? parsed : undefined;
  const warmUp = target !== undefined ? prAttemptSetsAfter(prAttemptPlan(target), warmKg).slice(0, -1) : [];

  function pick(id: LiftId) {
    setLift(id);
    setText(undefined);
  }

  const chip = (selected: boolean) =>
    `flex min-h-11 items-center justify-center px-1 text-center text-[13px] leading-tight font-extrabold ${
      selected ? 'bg-gym text-on-gym' : 'bg-surface-2 text-muted'
    }`;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (target === undefined || !exercise) return;
        await addPrAttempt(workoutId, exercise.id, target);
        onClose();
      }}
    >
      <div role="radiogroup" aria-label="Mouvement" className="mb-4 grid grid-cols-5 gap-1">
        {LIFT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === lift}
            className={chip(id === lift)}
            onClick={() => pick(id)}
          >
            {TRACKED_LIFTS[id].label}
          </button>
        ))}
      </div>
      <TextField
        label="Charge visée pour 1 rep"
        suffix="kg"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => setText(e.target.value)}
        error={
          value.trim() !== '' && target === undefined ? `Entre ${MIN_PR_KG} et ${MAX_PR_KG} kg` : undefined
        }
        hint={
          target !== undefined
            ? [
                warmUp.length > 0
                  ? `Échauffement : ${warmUp.map((s) => `${formatWeight(s.weightKg)} × ${s.reps}`).join(', ')}`
                  : 'Pas d’échauffement en plus : tu es déjà chaud',
                best !== undefined && best > 0 ? `record : ${formatWeight(best)} kg` : '',
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
      />
      <p className="mt-2 text-sm text-muted">
        {own.length > 0
          ? 'Les séries s’ajoutent à la suite de celles de cet exercice.'
          : 'L’exercice s’ajoute à la fin de ta séance.'}
      </p>
      <Button type="submit" className="mt-4 w-full" disabled={target === undefined || !exercise}>
        Ajouter à la séance
      </Button>
    </form>
  );
}

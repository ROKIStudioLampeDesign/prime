import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/Progress';
import { TextField } from '../../components/TextField';
import { setBenchGoalKg } from '../../db/liftGoals';
import { parseDecimal } from '../../domain/number';
import { liftGoalProgress, type PersonalRecords } from '../../domain/strength';
import { formatWeight } from '../../lib/format';

const MAX_GOAL_KG = 500;

interface BenchGoalProps {
  records: PersonalRecords;
  goalKg: number | undefined;
}

/** The one-rep bench goal: how far the heaviest real lift is from it, and a sheet to set it. */
export function BenchGoal({ records, goalKg }: BenchGoalProps) {
  const [editing, setEditing] = useState(false);
  const progress = liftGoalProgress(records, goalKg);

  return (
    <section aria-labelledby="bench-goal-title" className="border-b border-line py-4">
      {progress ? (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="bench-goal-title" className="text-xs font-extrabold text-muted">
              Objectif · 1 rep
            </h3>
            <p className="text-xl leading-tight headline tabular-nums">{formatWeight(progress.goalKg)} kg</p>
          </div>
          <div className="mt-2">
            <ProgressBar ratio={progress.ratio} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold tabular-nums">
              {progress.reached
                ? `Atteint : ${formatWeight(progress.bestKg)} kg soulevés`
                : progress.bestKg > 0
                  ? `Encore ${formatWeight(progress.remainingKg)} kg · max ${formatWeight(progress.bestKg)} kg`
                  : 'Pas encore de charge au bench'}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="-mr-2 min-h-11 shrink-0 px-2 text-sm font-extrabold text-accent active:opacity-60"
            >
              Modifier
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 id="bench-goal-title" className="sr-only">
            Objectif
          </h3>
          <Button variant="secondary" className="w-full" onClick={() => setEditing(true)}>
            Me fixer un objectif
          </Button>
        </>
      )}

      <BottomSheet open={editing} onClose={() => setEditing(false)} title="Objectif au bench">
        {editing && <GoalForm goalKg={goalKg} onClose={() => setEditing(false)} />}
      </BottomSheet>
    </section>
  );
}

function GoalForm({ goalKg, onClose }: { goalKg: number | undefined; onClose: () => void }) {
  const [text, setText] = useState(goalKg !== undefined ? formatWeight(goalKg) : '');
  const parsed = parseDecimal(text);
  const value = parsed !== undefined && parsed >= 1 && parsed <= MAX_GOAL_KG ? parsed : undefined;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (value === undefined) return;
        await setBenchGoalKg(value);
        onClose();
      }}
    >
      <p className="mb-3 text-sm text-muted">La charge que tu veux soulever pour 1 rep.</p>
      <TextField
        label="Charge visée"
        suffix="kg"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={text.trim() !== '' && value === undefined ? `Entre 1 et ${MAX_GOAL_KG} kg` : undefined}
      />
      <Button type="submit" className="mt-4 w-full" disabled={value === undefined}>
        Enregistrer
      </Button>
      {goalKg !== undefined && (
        <Button
          variant="danger"
          className="mt-2 w-full"
          onClick={async () => {
            await setBenchGoalKg(undefined);
            onClose();
          }}
        >
          Retirer l’objectif
        </Button>
      )}
    </form>
  );
}

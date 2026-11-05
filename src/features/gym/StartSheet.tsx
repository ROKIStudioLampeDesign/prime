import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { useNow } from '../../components/useNow';
import { getBenchBestKg } from '../../db/stats';
import { listTemplates } from '../../db/templates';
import { getActiveWorkout, getWorkoutSets, startPrBenchWorkout, startWorkout } from '../../db/workouts';
import { parseDecimal } from '../../domain/number';
import { defaultPrTarget, prBenchPlan } from '../../domain/streaks';
import { TextField } from '../../components/TextField';
import { formatDuration, formatWeight } from '../../lib/format';
import { workoutTitle } from './workoutLabels';

/** Resume card while a workout is active, else the start button. */
export function ActiveOrStart({ onStart }: { onStart: () => void }) {
  const active = useLiveQuery(async () => (await getActiveWorkout()) ?? null);
  const sets = useLiveQuery(async () => (active ? getWorkoutSets(active.id) : []), [active?.id]);
  const now = useNow(30_000, Boolean(active));
  if (active === undefined) return <div className="h-12" />;
  if (active === null) {
    return (
      <Button className="w-full" onClick={onStart}>
        Commencer une séance
      </Button>
    );
  }
  const done = sets?.filter((s) => s.completed).length ?? 0;
  return (
    <Link
      to={`/gym/workout/${active.id}`}
      className="bleed flex min-h-20 items-center gap-3 bg-gym py-4 text-on-gym focus-inset active:opacity-90"
    >
      <span className="size-2.5 shrink-0 animate-pulse bg-on-gym" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-extrabold">{workoutTitle(active)}</span>
        <span className="block text-sm font-bold">
          {formatDuration(now - active.startedAt)} · {done} série{done > 1 ? 's' : ''} validée
          {done > 1 ? 's' : ''}
        </span>
      </span>
      <span className="bg-accent-fill px-4 py-3 text-sm font-black text-accent-fg">Reprendre</span>
    </Link>
  );
}

export function StartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const templates = useLiveQuery(listTemplates);

  async function start(templateId?: number) {
    const id = await startWorkout(templateId);
    onClose();
    void navigate(`/gym/workout/${id}`);
  }

  async function startPr(targetKg: number) {
    const id = await startPrBenchWorkout(targetKg);
    onClose();
    void navigate(`/gym/workout/${id}`);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Commencer une séance">
      <Button className="w-full" onClick={() => void start()}>
        Séance libre
      </Button>
      {open && <PrBenchStart onStart={(kg) => void startPr(kg)} />}
      <h3 className="mt-5 mb-2 text-sm font-semibold text-muted">Depuis un modèle</h3>
      {templates === undefined ? null : templates.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun modèle pour l’instant.{' '}
          <Link to="/gym/templates/new" className="font-semibold text-accent" onClick={onClose}>
            Créer un modèle
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => void start(t.id)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left active:bg-surface-2"
              >
                <span className="truncate font-semibold">{t.name}</span>
                <span className="shrink-0 text-sm text-muted">
                  {t.exercises.length} exercice{t.exercises.length > 1 ? 's' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}

const MAX_PR_KG = 400;

/** "Séance PR bench": a target load (best + 2.5 kg by default), then a warm-up ramp and a single. */
function PrBenchStart({ onStart }: { onStart: (targetKg: number) => void }) {
  const best = useLiveQuery(getBenchBestKg);
  const [text, setText] = useState<string>();
  const [expanded, setExpanded] = useState(false);
  if (best === undefined) return <div className="mt-2 h-12" />;

  const value = text ?? formatWeight(defaultPrTarget(best));
  const parsed = parseDecimal(value);
  const target = parsed !== undefined && parsed >= 20 && parsed <= MAX_PR_KG ? parsed : undefined;

  if (!expanded) {
    return (
      <Button variant="secondary" className="mt-2 w-full" onClick={() => setExpanded(true)}>
        Séance PR bench
      </Button>
    );
  }
  return (
    <form
      className="mt-3 border-y border-line py-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (target !== undefined) onStart(target);
      }}
    >
      <TextField
        label="Charge visée pour 1 rep"
        suffix="kg"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => setText(e.target.value)}
        error={target === undefined ? `Entre 20 et ${MAX_PR_KG} kg` : undefined}
        hint={
          target !== undefined
            ? `Échauffement : ${prBenchPlan(target)
                .slice(0, -1)
                .map((s) => `${formatWeight(s.weightKg)} × ${s.reps}`)
                .join(', ')}${best > 0 ? ` · record : ${formatWeight(best)} kg` : ''}`
            : undefined
        }
      />
      <Button type="submit" className="mt-3 w-full" disabled={target === undefined}>
        Lancer la tentative
      </Button>
    </form>
  );
}

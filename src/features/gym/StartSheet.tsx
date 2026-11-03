import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { useNow } from '../../components/useNow';
import { listTemplates } from '../../db/templates';
import { getActiveWorkout, getWorkoutSets, startWorkout } from '../../db/workouts';
import { formatDuration } from '../../lib/format';
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
      className="flex min-h-20 items-center gap-3 rounded-3xl bg-sky px-5 py-4 text-ink active:opacity-90"
    >
      <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-ink" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-extrabold">{workoutTitle(active)}</span>
        <span className="block text-sm font-semibold text-ink/75">
          {formatDuration(now - active.startedAt)} · {done} série{done > 1 ? 's' : ''} validée
          {done > 1 ? 's' : ''}
        </span>
      </span>
      <span className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-on-ink">Reprendre</span>
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

  return (
    <BottomSheet open={open} onClose={onClose} title="Commencer une séance">
      <Button className="w-full" onClick={() => void start()}>
        Séance libre
      </Button>
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

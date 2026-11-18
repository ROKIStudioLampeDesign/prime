import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { useNow } from '../../components/useNow';
import { listPartners } from '../../db/partners';
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
  // Who you train with: undefined = alone (the default each time the sheet opens).
  const [partnerId, setPartnerId] = useState<number>();

  async function start(templateId?: number) {
    const id = await startWorkout(templateId, undefined, partnerId);
    setPartnerId(undefined);
    onClose();
    void navigate(`/gym/workout/${id}`);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Commencer une séance">
      <PartnerPicker value={partnerId} onChange={setPartnerId} onClose={onClose} />
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

/** "Tu t’entraînes avec quelqu’un ?": alone, or one of your teammates. */
function PartnerPicker({
  value,
  onChange,
  onClose,
}: {
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  onClose: () => void;
}) {
  const partners = useLiveQuery(listPartners);
  if (partners === undefined) return <div className="h-24" />;
  const chip = (selected: boolean) =>
    `flex min-h-11 items-center justify-center px-4 text-[15px] font-black ${
      selected ? 'bg-accent-fill text-accent-fg' : 'border-2 border-line active:bg-surface-2'
    }`;
  return (
    <div className="mb-4" role="radiogroup" aria-label="Tu t’entraînes avec quelqu’un ?">
      <h3 className="mb-2 text-sm font-semibold text-muted">Tu t’entraînes avec quelqu’un ?</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={value === undefined}
          className={chip(value === undefined)}
          onClick={() => onChange(undefined)}
        >
          Seul
        </button>
        {partners.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={value === p.id}
            className={chip(value === p.id)}
            onClick={() => onChange(p.id)}
          >
            {p.name}
          </button>
        ))}
        <Link to="/settings/partners" onClick={onClose} className={`${chip(false)} text-muted`}>
          {partners.length === 0 ? '+ Ajouter un coéquipier' : '+ Nouveau'}
        </Link>
      </div>
    </div>
  );
}

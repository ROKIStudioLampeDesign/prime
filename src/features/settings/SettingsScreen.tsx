import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { ForwardIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { db } from '../../db/db';
import { getGoals } from '../../db/goals';
import type { Goals } from '../../domain/nutrition';
import { formatMacro } from '../../lib/format';

function goalsSummary(goals: Goals): string {
  const parts = [];
  if (goals.kcal !== undefined) parts.push(`${formatMacro('kcal', goals.kcal)} kcal`);
  if (goals.protein !== undefined) parts.push(`${formatMacro('protein', goals.protein)} g prot.`);
  return parts.length > 0 ? parts.join(' · ') : 'Non définis';
}

export function SettingsScreen() {
  // `undefined` while loading, `null` once loaded if the flag was never recorded.
  const persisted = useLiveQuery(async () => (await db.settings.get('storagePersisted'))?.value ?? null);
  const goals = useLiveQuery(getGoals);

  return (
    <Screen title="Réglages" back>
      {persisted === undefined || goals === undefined ? (
        <Loading />
      ) : (
        <>
          <section className="mt-2 overflow-hidden rounded-2xl bg-surface">
            <Link
              to="/settings/goals"
              className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-surface-2"
            >
              <span className="flex-1">Objectifs</span>
              <span className="text-sm text-muted">{goalsSummary(goals)}</span>
              <ForwardIcon className="size-5 text-muted" />
            </Link>
          </section>

          <section className="mt-4 rounded-2xl bg-surface">
            <div className="flex min-h-11 items-center justify-between px-4 py-3">
              <span>Stockage persistant</span>
              <span className="text-sm text-muted">{persisted === true ? 'Activé' : 'Non garanti'}</span>
            </div>
          </section>
        </>
      )}
      <p className="mt-3 px-1 text-xs text-muted">
        Toutes tes données restent sur cet appareil. Ajoute Prime à l'écran d'accueil pour éviter que Safari
        ne les efface.
      </p>

      {import.meta.env.DEV && <DevTools />}
    </Screen>
  );
}

/** Development helpers; `import.meta.env.DEV` is false in production builds, so this is stripped. */
function DevTools() {
  const [status, setStatus] = useState<string>();
  return (
    <section className="mt-8 rounded-2xl border border-dashed border-line p-4">
      <h2 className="text-sm font-semibold text-muted">Développement</h2>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={async () => {
          setStatus('Chargement…');
          const { loadDemoData } = await import('../../db/demo');
          await loadDemoData();
          setStatus('Données de démo chargées (alimentation remplacée).');
        }}
      >
        Charger des données de démo
      </Button>
      {status && <p className="mt-2 text-xs text-muted">{status}</p>}
    </section>
  );
}

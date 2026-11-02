import { useLiveQuery } from 'dexie-react-hooks';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { db } from '../../db/db';

export function SettingsScreen() {
  // `undefined` while loading, `null` once loaded if the flag was never recorded.
  const persisted = useLiveQuery(async () => (await db.settings.get('storagePersisted'))?.value ?? null);

  return (
    <Screen title="Réglages" back>
      {persisted === undefined ? (
        <Loading />
      ) : (
        <section className="mt-2 rounded-2xl bg-surface">
          <div className="flex min-h-11 items-center justify-between px-4 py-3">
            <span>Stockage persistant</span>
            <span className="text-sm text-muted">{persisted === true ? 'Activé' : 'Non garanti'}</span>
          </div>
        </section>
      )}
      <p className="mt-3 px-1 text-xs text-muted">
        Toutes tes données restent sur cet appareil. Ajoute Prime à l'écran d'accueil pour éviter que Safari
        ne les efface.
      </p>
    </Screen>
  );
}

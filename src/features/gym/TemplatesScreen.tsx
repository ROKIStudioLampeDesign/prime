import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { listTemplates } from '../../db/templates';
import { exerciseName, useExercisesById } from './exerciseData';
import { GymTabs } from './shared';

export function TemplatesScreen() {
  const templates = useLiveQuery(listTemplates);
  const exercises = useExercisesById();

  return (
    <Screen title="Salle">
      <GymTabs />
      {templates === undefined || exercises === undefined ? (
        <Loading />
      ) : templates.length === 0 ? (
        <EmptyState
          title="Aucun modèle"
          description="Crée tes séances types (Push, Pull, Jambes…) pour les lancer en un geste avec tes dernières charges."
          action={
            <Link
              to="/gym/templates/new"
              className="flex min-h-12 items-center rounded-xl bg-accent-fill px-5 font-semibold text-accent-fg"
            >
              Créer un modèle
            </Link>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {templates.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/gym/templates/${t.id}`}
                  className="block rounded-2xl bg-surface px-4 py-3 active:bg-surface-2"
                >
                  <p className="truncate font-semibold">{t.name}</p>
                  <p className="truncate text-sm text-muted">
                    {t.exercises.length} exercice{t.exercises.length > 1 ? 's' : ''}
                    {t.exercises.length > 0 &&
                      ` · ${t.exercises.map((e) => exerciseName(exercises, e.exerciseId)).join(', ')}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="h-16" />
          <Fab to="/gym/templates/new" label="Créer un modèle" />
        </>
      )}
    </Screen>
  );
}

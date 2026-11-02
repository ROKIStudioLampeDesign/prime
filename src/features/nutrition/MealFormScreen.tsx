import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { useGoBack } from '../../components/useGoBack';
import { getMeal } from '../../db/meals';
import { MealForm } from './MealForm';

/** /nutrition/meals/new and /nutrition/meals/:id */
export function MealFormScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack('/nutrition/meals');
  const mealId = id === undefined ? undefined : Number(id);
  // `null` = loaded but not found, `undefined` = loading.
  const meal = useLiveQuery(
    async () => (mealId === undefined ? null : ((await getMeal(mealId)) ?? null)),
    [mealId],
  );

  if (mealId === undefined) return <MealForm onSaved={goBack} />;

  if (meal === undefined) {
    return (
      <Screen title="Plat" back backFallback="/nutrition/meals">
        <Loading />
      </Screen>
    );
  }
  if (meal === null) {
    return (
      <Screen title="Plat" back backFallback="/nutrition/meals">
        <EmptyState title="Plat introuvable" description="Il a peut-être été supprimé." />
      </Screen>
    );
  }
  // Keyed so the form re-initialises when another meal (e.g. a fresh duplicate) is opened.
  return (
    <MealForm
      key={meal.id}
      meal={meal}
      onSaved={goBack}
      onDeleted={goBack}
      onDuplicated={(copyId) => void navigate(`/nutrition/meals/${copyId}`, { replace: true })}
    />
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { useGoBack } from '../../components/useGoBack';
import { getFood } from '../../db/foods';
import { FoodForm } from './FoodForm';

/** /nutrition/foods/new and /nutrition/foods/:id */
export function FoodFormScreen() {
  const { id } = useParams();
  const goBack = useGoBack('/nutrition/foods');
  const foodId = id === undefined ? undefined : Number(id);
  // `null` = loaded but not found, `undefined` = loading.
  const food = useLiveQuery(
    async () => (foodId === undefined ? null : ((await getFood(foodId)) ?? null)),
    [foodId],
  );

  if (foodId === undefined) return <FoodForm onSaved={goBack} />;

  if (food === undefined) {
    return (
      <Screen title="Produit" back backFallback="/nutrition/foods">
        <Loading />
      </Screen>
    );
  }
  if (food === null) {
    return (
      <Screen title="Produit" back backFallback="/nutrition/foods">
        <EmptyState title="Produit introuvable" description="Il a peut-être été supprimé." />
      </Screen>
    );
  }
  // Keyed so the form re-initialises if another food is opened, but not on live-query refreshes.
  return <FoodForm key={food.id} food={food} onSaved={goBack} onDeleted={goBack} />;
}

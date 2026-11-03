import { useLiveQuery } from 'dexie-react-hooks';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BlobImage } from '../../components/BlobImage';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { StarIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { listFoods } from '../../db/foods';
import { rankItems } from '../../domain/search';
import { formatMacro } from '../../lib/format';
import { NutritionTabs } from './NutritionTabs';
import { SearchField } from '../../components/SearchField';

export function FoodsScreen() {
  const foods = useLiveQuery(listFoods);
  const [query, setQuery] = useState('');

  const deferredQuery = useDeferredValue(query);
  const ranked = useMemo(
    () =>
      foods &&
      rankItems(
        foods.map((food) => ({
          key: String(food.id),
          name: food.name,
          brand: food.brand,
          favorite: food.favorite === 1,
          food,
        })),
        deferredQuery,
        [],
      ),
    [foods, deferredQuery],
  );

  return (
    <Screen title="Alimentation">
      <NutritionTabs />
      {ranked === undefined ? (
        <Loading />
      ) : foods?.length === 0 ? (
        <EmptyState
          title="Aucun produit"
          description="Enregistre les aliments que tu manges souvent avec leurs valeurs pour 100 g."
          action={
            <Link
              to="/nutrition/foods/new"
              className="flex min-h-12 items-center rounded-xl bg-accent-fill px-5 font-semibold text-accent-fg"
            >
              Créer un produit
            </Link>
          }
        />
      ) : (
        <>
          <SearchField value={query} onChange={setQuery} placeholder="Rechercher un produit" />
          {ranked.length === 0 ? (
            <EmptyState title={`Aucun produit pour « ${query.trim()} »`} />
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {ranked.map(({ food }) => (
                <li className="list-row" key={food.id}>
                  <Link
                    to={`/nutrition/foods/${food.id}`}
                    className="block overflow-hidden rounded-2xl bg-surface active:opacity-80"
                  >
                    <div className="relative">
                      <BlobImage blob={food.photo} alt="" className="aspect-square w-full" />
                      {food.favorite === 1 && (
                        <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-bg/70 text-accent">
                          <StarIcon filled className="size-4" aria-label="Favori" />
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold">{food.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {formatMacro('kcal', food.per100g.kcal)} kcal · P{' '}
                        {formatMacro('protein', food.per100g.protein)} g
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="h-16" />
        </>
      )}
      {foods !== undefined && foods.length > 0 && <Fab to="/nutrition/foods/new" label="Créer un produit" />}
    </Screen>
  );
}

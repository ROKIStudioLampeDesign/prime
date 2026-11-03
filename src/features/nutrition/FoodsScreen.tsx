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
              className="flex min-h-12 items-center bg-accent-fill px-5 font-black text-accent-fg"
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
            // Edge-to-edge tiles: favourites yellow, the others paper; a photo or the initial on top.
            <ul className="mt-4 edge grid grid-cols-2 gap-0.5">
              {ranked.map(({ food }) => (
                <li className="list-row [--row-h:11rem]" key={food.id}>
                  <Link
                    to={`/nutrition/foods/${food.id}`}
                    className={`flex h-44 flex-col justify-between p-3.5 text-ink focus-inset active:opacity-80 ${
                      food.favorite === 1 ? 'bg-nutrition' : 'bg-paper'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {food.photo ? (
                        <BlobImage blob={food.photo} alt="" className="size-16" />
                      ) : (
                        <span aria-hidden="true" className="text-[3.5rem] leading-[0.8] numeral">
                          {food.name.trim().charAt(0).toLocaleUpperCase('fr')}
                        </span>
                      )}
                      {food.favorite === 1 && <StarIcon filled className="size-5" aria-label="Favori" />}
                    </div>
                    <div>
                      <p className="line-clamp-2 text-[15px] leading-tight font-extrabold">{food.name}</p>
                      <p className="mt-1 truncate text-xs font-bold text-ink/72">
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

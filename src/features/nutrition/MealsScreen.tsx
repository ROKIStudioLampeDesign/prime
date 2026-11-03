import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BlobImage } from '../../components/BlobImage';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { StarIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { rankItems } from '../../domain/search';
import { formatMacro } from '../../lib/format';
import { NutritionTabs } from './NutritionTabs';
import { usePickerItems } from './pickerItems';
import { SearchField } from '../../components/SearchField';

export function MealsScreen() {
  const data = usePickerItems(true);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const meals = useMemo(
    () =>
      data &&
      rankItems(
        data.items.filter((i) => i.kind === 'meal'),
        deferredQuery,
        [],
      ),
    [data, deferredQuery],
  );
  const hasAnyMeal = data?.items.some((i) => i.kind === 'meal');

  return (
    <Screen title="Alimentation">
      <NutritionTabs />
      {meals === undefined ? (
        <Loading />
      ) : !hasAnyMeal ? (
        <EmptyState
          title="Aucun plat"
          description="Enregistre tes recettes (ingrédients et quantités) pour les noter en un geste."
          action={
            <Link
              to="/nutrition/meals/new"
              className="flex min-h-12 items-center rounded-xl bg-accent-fill px-5 font-semibold text-accent-fg"
            >
              Créer un plat
            </Link>
          }
        />
      ) : (
        <>
          <SearchField value={query} onChange={setQuery} placeholder="Rechercher un plat" />
          {meals.length === 0 ? (
            <EmptyState title={`Aucun plat pour « ${query.trim()} »`} />
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
              {meals.map(({ meal, summary }) => (
                <li className="list-row" key={meal.id}>
                  <Link
                    to={`/nutrition/meals/${meal.id}`}
                    className="flex min-h-20 items-center gap-3 px-3 py-2 active:bg-surface-2"
                  >
                    <BlobImage blob={meal.photo} alt="" className="size-14 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5">
                        <span className="truncate font-semibold">{meal.name}</span>
                        {meal.favorite === 1 && (
                          <StarIcon filled className="size-3.5 shrink-0 text-accent" aria-label="Favori" />
                        )}
                      </p>
                      <p className="truncate text-xs text-muted tabular-nums">
                        {meal.ingredients.length} ingrédient{meal.ingredients.length > 1 ? 's' : ''} ·{' '}
                        {formatMacro('kcal', summary.perPortion.kcal)} kcal / portion · P{' '}
                        {formatMacro('protein', summary.perPortion.protein)} g
                      </p>
                      {summary.missingCount > 0 && (
                        <p className="text-xs text-danger">
                          {summary.missingCount} produit{summary.missingCount > 1 ? 's' : ''} supprimé
                          {summary.missingCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="h-16" />
        </>
      )}
      {hasAnyMeal && <Fab to="/nutrition/meals/new" label="Créer un plat" />}
    </Screen>
  );
}

import { useDeferredValue, useMemo, useState } from 'react';
import { BlobImage } from '../../components/BlobImage';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PlusIcon, StarIcon } from '../../components/icons';
import { rankItems } from '../../domain/search';
import { formatGrams, formatMacro } from '../../lib/format';
import type { PickerData, PickerItem } from './pickerItems';
import { SearchField } from '../../components/SearchField';

interface ProductPickerProps {
  data: PickerData;
  onSelect: (key: string) => void;
  /** Opens the product form, prefilled with the current search. */
  onCreateFood: (initialName: string) => void;
}

/**
 * Searchable list of meals and products. Meals come first (they are what is usually eaten),
 * favorites and recents first within them; products follow, grouped the same way.
 */
export function ProductPicker({ data, onSelect, onCreateFood }: ProductPickerProps) {
  const [query, setQuery] = useState('');
  // Typing stays responsive with a long product list: ranking follows on a deferred value.
  const deferredQuery = useDeferredValue(query);
  const ranked = useMemo(() => rankItems(data.items, deferredQuery, data.recentKeys), [data, deferredQuery]);
  const hasMeals = data.items.some((i) => i.kind === 'meal');
  const meals = ranked.filter((i) => i.kind === 'meal');
  const foods = ranked.filter((i) => i.kind === 'food');
  const searching = query.trim() !== '';

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="Aucun produit pour l’instant"
        description="Crée ton premier produit avec ses valeurs pour 100 g, il sera ensuite réutilisable."
        action={<Button onClick={() => onCreateFood('')}>Créer un produit</Button>}
      />
    );
  }

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={hasMeals ? 'Rechercher un produit ou un plat' : 'Rechercher un produit'}
      />
      {ranked.length === 0 ? (
        <EmptyState
          title={`Aucun résultat pour « ${query.trim()} »`}
          action={<Button onClick={() => onCreateFood(query)}>Créer le produit « {query.trim()} »</Button>}
        />
      ) : searching ? (
        <ItemList items={[...meals, ...foods]} onSelect={onSelect} />
      ) : (
        <>
          <ItemList title="Plats" items={meals} onSelect={onSelect} />
          <ItemList title="Produits favoris" items={foods.filter((i) => i.favorite)} onSelect={onSelect} />
          <ItemList
            title="Produits récents"
            items={foods.filter((i) => !i.favorite && i.recent)}
            onSelect={onSelect}
          />
          <ItemList
            title={hasMeals ? 'Autres produits' : 'Tous les produits'}
            items={foods.filter((i) => !i.favorite && !i.recent)}
            onSelect={onSelect}
          />
        </>
      )}
      <Button variant="ghost" className="mt-4 w-full" onClick={() => onCreateFood(query)}>
        <PlusIcon className="size-5" />
        Nouveau produit
      </Button>
    </>
  );
}

function ItemList({
  title,
  items,
  onSelect,
}: {
  title?: string;
  items: PickerItem[];
  onSelect: (key: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-4">
      {title && <h2 className="mb-1 text-lg leading-tight headline">{title}</h2>}
      <ul className="divide-y divide-line border-b border-line">
        {items.map((item) => (
          <li className="list-row [--row-h:4rem]" key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex min-h-16 w-full items-center gap-3 py-2 text-left active:opacity-60"
            >
              <BlobImage blob={item.photo} alt="" className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className="truncate font-bold">{item.name}</span>
                  {item.favorite && (
                    <StarIcon filled className="size-3.5 shrink-0 text-accent" aria-label="Favori" />
                  )}
                  {item.kind === 'meal' && <MealBadge />}
                </p>
                <p className="truncate text-[13px] font-medium text-muted">{itemSubtitle(item)}</p>
              </div>
              {item.recent && (
                <span className="shrink-0 text-sm font-bold text-muted tabular-nums">
                  {recentAmount(item)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MealBadge() {
  return (
    <span className="shrink-0 bg-accent-fill px-1.5 py-0.5 text-[11px] font-black text-accent-fg">Plat</span>
  );
}

function itemSubtitle(item: PickerItem): string {
  if (item.kind === 'food') {
    return `${item.brand ? `${item.brand} · ` : ''}${formatMacro('kcal', item.food.per100g.kcal)} kcal / 100 g`;
  }
  const { summary } = item;
  const missing = summary.missingCount > 0 ? ' · produit supprimé' : '';
  return `${formatMacro('kcal', summary.perPortion.kcal)} kcal / portion${missing}`;
}

function recentAmount(item: PickerItem): string {
  const recent = item.recent;
  if (recent?.kind === 'meal' && recent.lastPortions !== undefined) {
    return `${formatGrams(recent.lastPortions)} port.`;
  }
  return recent ? `${formatGrams(recent.lastGrams)} g` : '';
}

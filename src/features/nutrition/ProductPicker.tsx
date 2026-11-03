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

/** Searchable list of products (and meals when present): favorites and recents first. */
export function ProductPicker({ data, onSelect, onCreateFood }: ProductPickerProps) {
  const [query, setQuery] = useState('');
  // Typing stays responsive with a long product list: ranking follows on a deferred value.
  const deferredQuery = useDeferredValue(query);
  const ranked = useMemo(() => rankItems(data.items, deferredQuery, data.recentKeys), [data, deferredQuery]);
  const hasMeals = data.items.some((i) => i.kind === 'meal');
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
        <ItemList items={ranked} onSelect={onSelect} />
      ) : (
        <>
          <ItemList title="Favoris" items={ranked.filter((i) => i.favorite)} onSelect={onSelect} />
          <ItemList
            title="Récents"
            items={ranked.filter((i) => !i.favorite && i.recent)}
            onSelect={onSelect}
          />
          <ItemList
            title="Plats"
            items={ranked.filter((i) => !i.favorite && !i.recent && i.kind === 'meal')}
            onSelect={onSelect}
          />
          <ItemList
            title={hasMeals ? 'Produits' : 'Tous les produits'}
            items={ranked.filter((i) => !i.favorite && !i.recent && i.kind === 'food')}
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
      {title && <h2 className="mb-1 px-1 text-sm font-semibold text-muted">{title}</h2>}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
        {items.map((item) => (
          <li className="list-row" key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left active:bg-surface-2"
            >
              <BlobImage blob={item.photo} alt="" className="size-11 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className="truncate">{item.name}</span>
                  {item.favorite && (
                    <StarIcon filled className="size-3.5 shrink-0 text-accent" aria-label="Favori" />
                  )}
                  {item.kind === 'meal' && <MealBadge />}
                </p>
                <p className="truncate text-xs text-muted">{itemSubtitle(item)}</p>
              </div>
              {item.recent && (
                <span className="shrink-0 text-sm text-muted tabular-nums">{recentAmount(item)}</span>
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
    <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-accent">
      Plat
    </span>
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

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BlobImage } from '../../components/BlobImage';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PlusIcon, StarIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { useGoBack } from '../../components/useGoBack';
import type { Food } from '../../db/db';
import { listFoods, setFavorite } from '../../db/foods';
import { addEntry, listRecentFoods } from '../../db/logEntries';
import { todayLocalDate } from '../../domain/date';
import { defaultSlotForHour } from '../../domain/nutrition';
import { rankFoods } from '../../domain/search';
import { formatGrams, formatMacro } from '../../lib/format';
import { FoodForm } from './FoodForm';
import { SLOT_LABELS } from './labels';
import { diaryPath, parseDateParam, parseSlotParam } from './params';
import { PortionSheet } from './PortionSheet';
import { SearchField } from './SearchField';

const DEFAULT_GRAMS = 100;

interface Candidate {
  id: number;
  name: string;
  brand?: string;
  favorite: boolean;
  food: Food;
  lastGrams?: number;
}

export function AddEntryScreen() {
  const [params] = useSearchParams();
  const date = parseDateParam(params.get('date')) ?? todayLocalDate();
  const slot = parseSlotParam(params.get('slot')) ?? defaultSlotForHour(new Date().getHours());
  const goBack = useGoBack(diaryPath(date));

  const foods = useLiveQuery(listFoods);
  const recents = useLiveQuery(() => listRecentFoods());
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [creating, setCreating] = useState(false);
  const closeSheet = () => setSelectedId(undefined);

  const ranked = useMemo(() => {
    if (!foods || !recents) return undefined;
    const lastGrams = new Map(recents.map((r) => [r.foodId, r.lastGrams]));
    const candidates: Candidate[] = foods.map((food) => ({
      id: food.id,
      name: food.name,
      brand: food.brand,
      favorite: food.favorite === 1,
      food,
      lastGrams: lastGrams.get(food.id),
    }));
    return rankFoods(
      candidates,
      query,
      recents.map((r) => r.foodId),
    );
  }, [foods, recents, query]);

  if (creating) {
    return (
      <FoodForm
        initialName={query}
        onSaved={(id) => {
          setCreating(false);
          setQuery('');
          setSelectedId(id);
        }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  const selected = ranked?.find((c) => c.id === selectedId);
  const searching = query.trim() !== '';

  return (
    <Screen title={`Ajouter · ${SLOT_LABELS[slot]}`} back backFallback={diaryPath(date)}>
      {ranked === undefined ? (
        <Loading />
      ) : foods?.length === 0 ? (
        <EmptyState
          title="Aucun produit pour l’instant"
          description="Crée ton premier produit avec ses valeurs pour 100 g, il sera ensuite réutilisable."
          action={<Button onClick={() => setCreating(true)}>Créer un produit</Button>}
        />
      ) : (
        <>
          <SearchField value={query} onChange={setQuery} placeholder="Rechercher un produit" />
          {ranked.length === 0 ? (
            <EmptyState
              title={`Aucun produit pour « ${query.trim()} »`}
              action={<Button onClick={() => setCreating(true)}>Créer « {query.trim()} »</Button>}
            />
          ) : searching ? (
            <CandidateList items={ranked} onSelect={setSelectedId} />
          ) : (
            <>
              <CandidateList
                title="Favoris"
                items={ranked.filter((c) => c.favorite)}
                onSelect={setSelectedId}
              />
              <CandidateList
                title="Récents"
                items={ranked.filter((c) => !c.favorite && c.lastGrams !== undefined)}
                onSelect={setSelectedId}
              />
              <CandidateList
                title="Tous les produits"
                items={ranked.filter((c) => !c.favorite && c.lastGrams === undefined)}
                onSelect={setSelectedId}
              />
            </>
          )}
          <Button variant="ghost" className="mt-4 w-full" onClick={() => setCreating(true)}>
            <PlusIcon className="size-5" />
            Nouveau produit
          </Button>
        </>
      )}

      <PortionSheet
        food={selected?.food}
        formKey={String(selectedId)}
        initialGrams={selected?.lastGrams ?? DEFAULT_GRAMS}
        initialSlot={slot}
        submitLabel="Ajouter"
        favorite={selected?.favorite}
        onToggleFavorite={() => selected && void setFavorite(selected.id, !selected.favorite)}
        onSubmit={async (grams, chosenSlot) => {
          if (!selected) return;
          await addEntry({ date, slot: chosenSlot, food: selected.food, grams });
          goBack();
        }}
        onClose={closeSheet}
      />
    </Screen>
  );
}

function CandidateList({
  title,
  items,
  onSelect,
}: {
  title?: string;
  items: Candidate[];
  onSelect: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-4">
      {title && (
        <h2 className="mb-1 px-1 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h2>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
        {items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left active:bg-surface-2"
            >
              <BlobImage blob={c.food.photo} alt="" className="size-11 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1">
                  <span className="truncate">{c.name}</span>
                  {c.favorite && (
                    <StarIcon filled className="size-3.5 shrink-0 text-accent" aria-label="Favori" />
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  {c.brand && `${c.brand} · `}
                  {formatMacro('kcal', c.food.per100g.kcal)} kcal / 100 g
                </p>
              </div>
              {c.lastGrams !== undefined && (
                <span className="shrink-0 text-sm text-muted tabular-nums">{formatGrams(c.lastGrams)} g</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

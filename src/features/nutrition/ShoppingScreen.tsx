import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { EmptyState } from '../../components/EmptyState';
import { CheckIcon, PlusIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { NumericInput } from '../../components/NumericInput';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import type { Food, ShoppingItem } from '../../db/db';
import { listFoods } from '../../db/foods';
import {
  addShoppingItem,
  deleteShoppingItem,
  finishShopping,
  getShoppingPrices,
  listShoppingItems,
  priceKey,
  updateShoppingItem,
} from '../../db/shopping';
import { parseDecimal } from '../../domain/number';
import { normalizeText } from '../../domain/search';
import { centsPerKg, estimateCents, parseEuros } from '../../domain/shopping';
import { formatEuros, formatGrams } from '../../lib/format';
import { NutritionTabs } from './NutritionTabs';

const checkBox = (checked: boolean) =>
  `flex size-11 shrink-0 items-center justify-center ${
    checked ? 'bg-accent-fill text-accent-fg' : 'border-2 border-fg active:bg-surface'
  }`;

/** /nutrition/courses — the shopping list; `?magasin=1` while in the shop. */
export function ShoppingScreen() {
  const [params, setParams] = useSearchParams();
  const inShop = params.get('magasin') === '1';
  const items = useLiveQuery(listShoppingItems);
  const prices = useLiveQuery(getShoppingPrices);
  const setShop = (on: boolean) => setParams(on ? { magasin: '1' } : {}, { replace: true });

  if (inShop) {
    return (
      <Screen title="Au magasin" back onBack={() => setShop(false)}>
        {items === undefined || prices === undefined ? (
          <Loading />
        ) : (
          <ShopMode items={items} onDone={() => setShop(false)} />
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Alimentation">
      <NutritionTabs />
      {items === undefined || prices === undefined ? (
        <Loading />
      ) : (
        <ListMode items={items} prices={prices} onShop={() => setShop(true)} />
      )}
    </Screen>
  );
}

function ListMode({
  items,
  prices,
  onShop,
}: {
  items: ShoppingItem[];
  prices: Map<string, number>;
  onShop: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number>();
  const editing = items.find((i) => i.id === editingId);
  const estimate = (item: ShoppingItem) => {
    const perKg = prices.get(priceKey(item));
    return perKg !== undefined && item.neededG !== undefined ? estimateCents(item.neededG, perKg) : undefined;
  };
  const estimates = items.map(estimate);
  const total = estimates.reduce<number>((sum, e) => sum + (e ?? 0), 0);
  const priced = estimates.filter((e) => e !== undefined).length;

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          to="/nutrition/courses/plats"
          className="flex min-h-12 items-center justify-center bg-accent-fill px-2 text-center text-sm font-black text-accent-fg"
        >
          Depuis mes plats
        </Link>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-12 items-center justify-center gap-1.5 border-2 border-line px-2 text-sm font-black active:bg-surface"
        >
          <PlusIcon className="size-4" strokeWidth={2.8} /> Ajouter
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Liste vide"
          description="Prépare tes courses depuis tes plats, ou ajoute ce qu’il te faut à la main, même un ingrédient qui n’est pas encore dans tes produits."
        />
      ) : (
        <>
          <h2 className="mt-5 text-lg leading-tight headline">À acheter</h2>
          <ul className="divide-y divide-line border-b border-line">
            {items.map((item, i) => (
              <li key={item.id} className="flex min-h-14 items-center gap-3 py-1.5">
                <button
                  type="button"
                  aria-pressed={item.checked}
                  aria-label={item.checked ? `Remettre ${item.name} à acheter` : `${item.name} pris`}
                  onClick={() => void updateShoppingItem(item.id, { checked: !item.checked })}
                  className={checkBox(item.checked)}
                >
                  {item.checked && <CheckIcon className="size-5" strokeWidth={3} />}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left active:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[15px] font-bold ${item.checked ? 'text-muted line-through' : ''}`}
                    >
                      {item.name}
                    </span>
                    <span className="block truncate text-xs font-semibold text-muted">
                      {estimates[i] !== undefined
                        ? `≈ ${formatEuros(estimates[i] ?? 0)} d’après la dernière fois`
                        : item.foodId === undefined
                          ? 'ajouté à la main'
                          : 'pas encore de prix'}
                    </span>
                  </span>
                  <span className="shrink-0 text-base font-black tabular-nums">
                    {item.neededG !== undefined ? `${formatGrams(item.neededG)} g` : '—'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {priced > 0 && (
            <div className="mt-4 bleed bg-paper py-3 text-ink">
              <p className="text-xs font-extrabold">Estimation</p>
              <p className="text-[2.4rem] leading-none numeral">≈ {formatEuros(total)}</p>
              <p className="mt-1 text-xs font-bold text-ink/72">
                {priced === items.length
                  ? 'd’après tes derniers prix'
                  : `pour ${priced} article${priced > 1 ? 's' : ''} sur ${items.length}, d’après tes derniers prix`}
              </p>
            </div>
          )}
          <Button className="mt-4 w-full" onClick={onShop}>
            Je suis au magasin
          </Button>
        </>
      )}

      <AddItemSheet open={adding} onClose={() => setAdding(false)} />
      <EditItemSheet key={editing?.id} item={editing} onClose={() => setEditingId(undefined)} />
    </>
  );
}

/** Adds a line: a product of the app (suggested while typing) or anything typed by hand. */
function AddItemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const foods = useLiveQuery(listFoods);
  const [name, setName] = useState('');
  const [food, setFood] = useState<Food>();
  const [grams, setGrams] = useState('');
  const query = normalizeText(name);
  const suggestions = useMemo(
    () =>
      query.length < 2 || food
        ? []
        : (foods ?? []).filter((f) => f.nameNormalized.includes(query)).slice(0, 4),
    [foods, query, food],
  );

  function reset() {
    setName('');
    setFood(undefined);
    setGrams('');
  }

  async function save() {
    if (!name.trim()) return;
    const neededG = parseDecimal(grams);
    await addShoppingItem({ name, foodId: food?.id, neededG });
    reset();
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Ajouter à la liste"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField
          label="Produit ou ingrédient"
          value={name}
          autoComplete="off"
          hint={
            food
              ? 'Lié à ton produit'
              : 'Tu peux écrire n’importe quoi, même s’il n’est pas dans tes produits.'
          }
          onChange={(e) => {
            setName(e.target.value);
            setFood(undefined);
          }}
        />
        {suggestions.length > 0 && (
          <ul className="mt-1 divide-y divide-line border-y border-line">
            {suggestions.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center text-left font-bold active:bg-surface-2"
                  onClick={() => {
                    setName(f.name);
                    setFood(f);
                  }}
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <TextField
            label="Quantité (facultatif)"
            suffix="g"
            inputMode="decimal"
            autoComplete="off"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={!name.trim()}>
          Ajouter
        </Button>
      </form>
    </BottomSheet>
  );
}

function EditItemSheet({ item, onClose }: { item: ShoppingItem | undefined; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [grams, setGrams] = useState(item?.neededG !== undefined ? formatGrams(item.neededG) : '');
  return (
    <BottomSheet open={item !== undefined} onClose={onClose} title={item?.name ?? ''}>
      {item && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void updateShoppingItem(item.id, { name: name.trim(), neededG: parseDecimal(grams) }).then(
              onClose,
            );
          }}
        >
          <TextField label="Nom" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
          <div className="mt-3">
            <TextField
              label="Quantité (facultatif)"
              suffix="g"
              inputMode="decimal"
              autoComplete="off"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>
          <Button type="submit" className="mt-4 w-full" disabled={!name.trim()}>
            Enregistrer
          </Button>
          <Button
            variant="danger"
            className="mt-2 w-full"
            onClick={() => void deleteShoppingItem(item.id).then(onClose)}
          >
            Retirer de la liste
          </Button>
        </form>
      )}
    </BottomSheet>
  );
}

/** In the shop: quantity and price of each thing taken, and the running total. */
function ShopMode({ items, onDone }: { items: ShoppingItem[]; onDone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const total = items.reduce((sum, i) => sum + (i.checked ? (i.priceCents ?? 0) : 0), 0);
  const taken = items.filter((i) => i.checked).length;

  if (items.length === 0) {
    return (
      <EmptyState title="Liste vide" description="Ajoute d’abord ce qu’il te faut dans l’onglet Courses." />
    );
  }

  return (
    <>
      <section aria-label="Total du panier" className="bleed bg-nutrition py-3 text-ink">
        <p className="text-xs font-extrabold">Total du panier</p>
        <p className="text-[3.2rem] leading-none numeral">{formatEuros(total)}</p>
        <p className="mt-1 text-xs font-bold text-ink/72">
          {taken} article{taken > 1 ? 's' : ''} pris sur {items.length}
        </p>
      </section>

      <ul className="mt-2 divide-y divide-line border-b border-line">
        {items.map((item) => {
          const perKg =
            item.priceCents !== undefined ? centsPerKg(item.priceCents, item.boughtG ?? 0) : undefined;
          const extra =
            item.neededG !== undefined && item.boughtG !== undefined && item.boughtG > item.neededG
              ? item.boughtG - item.neededG
              : undefined;
          return (
            <li
              key={item.id}
              className={`py-2 ${item.checked ? 'border-l-4 border-accent bg-linear-to-r from-accent/30 to-accent/5 pl-2' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[15px] font-bold">{item.name}</span>
                {item.neededG !== undefined && (
                  <span className="shrink-0 text-xs font-bold text-muted">
                    besoin {formatGrams(item.neededG)} g
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <label className="flex flex-1 items-center bg-surface pr-2">
                  <span className="sr-only">Quantité prise de {item.name}, en grammes</span>
                  <NumericInput
                    value={item.boughtG ?? 0}
                    onCommit={(boughtG) => void updateShoppingItem(item.id, { boughtG })}
                    className="h-11 w-full min-w-0 bg-transparent text-center text-lg font-black tabular-nums outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
                  />
                  <span className="text-xs font-bold text-muted">g</span>
                </label>
                <PriceInput item={item} />
                <button
                  type="button"
                  aria-pressed={item.checked}
                  aria-label={item.checked ? `Retirer ${item.name} du panier` : `${item.name} pris`}
                  onClick={() => void updateShoppingItem(item.id, { checked: !item.checked })}
                  className={checkBox(item.checked)}
                >
                  {item.checked && <CheckIcon className="size-5" strokeWidth={3} />}
                </button>
              </div>
              {(perKg !== undefined || extra !== undefined) && (
                <p className="mt-1 text-xs font-bold text-muted">
                  {perKg !== undefined && `${formatEuros(perKg)}/kg`}
                  {perKg !== undefined && extra !== undefined && ' · '}
                  {extra !== undefined && `plus que prévu : ${formatGrams(extra)} g en réserve`}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <Button className="mt-4 w-full" onClick={() => setConfirm(true)}>
        Terminer les courses
      </Button>
      <ConfirmSheet
        open={confirm}
        title="Terminer les courses ?"
        message="Les articles pris quittent la liste et leurs prix sont gardés pour la prochaine fois. Ceux pas pris restent dans la liste."
        confirmLabel="Terminer"
        onConfirm={() => {
          setConfirm(false);
          void finishShopping().then(onDone);
        }}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}

/** Price paid, in euros: local text while typing, saved on blur. Typing a price puts the item in the basket. */
function PriceInput({ item }: { item: ShoppingItem }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = item.priceCents !== undefined ? (item.priceCents / 100).toFixed(2).replace('.', ',') : '';
  return (
    <label className="flex flex-1 items-center bg-surface pr-2">
      <span className="sr-only">Prix de {item.name}, en euros</span>
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={draft ?? shown}
        onFocus={(e) => {
          setDraft(shown);
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const text = draft ?? '';
          setDraft(null);
          if (text.trim() === '') {
            void updateShoppingItem(item.id, { priceCents: undefined });
            return;
          }
          const cents = parseEuros(text);
          if (cents !== undefined) void updateShoppingItem(item.id, { priceCents: cents, checked: true });
        }}
        className="h-11 w-full min-w-0 bg-transparent text-center text-lg font-black tabular-nums outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
      />
      <span className="text-xs font-bold text-muted">€</span>
    </label>
  );
}

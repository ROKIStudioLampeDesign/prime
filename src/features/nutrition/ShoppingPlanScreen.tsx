import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { MinusIcon, PlusIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { NumericInput } from '../../components/NumericInput';
import { Screen } from '../../components/Screen';
import { listFoods } from '../../db/foods';
import { listMeals } from '../../db/meals';
import { addShoppingItem } from '../../db/shopping';
import { ingredientNeeds, toBuy } from '../../domain/shopping';
import { formatGrams } from '../../lib/format';

const MAX_DAYS = 31;
const MAX_PER_DAY = 6;

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  children,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  children: React.ReactNode;
}) {
  const button =
    'flex size-11 shrink-0 items-center justify-center border-2 border-line active:bg-surface disabled:opacity-30';
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Moins, ${label}`}
        className={button}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <MinusIcon className="size-4" strokeWidth={2.8} />
      </button>
      {children}
      <button
        type="button"
        aria-label={`Plus, ${label}`}
        className={button}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <PlusIcon className="size-4" strokeWidth={2.8} />
      </button>
    </span>
  );
}

/** /nutrition/courses/plats — what to buy for your dishes over a number of days. */
export function ShoppingPlanScreen() {
  const navigate = useNavigate();
  const meals = useLiveQuery(listMeals);
  const foods = useLiveQuery(listFoods);
  const [days, setDays] = useState(5);
  const [perDay, setPerDay] = useState<ReadonlyMap<number, number>>(new Map());
  const [left, setLeft] = useState<ReadonlyMap<number, number>>(new Map());
  const back = '/nutrition/courses';

  const foodsById = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods]);
  const needs = useMemo(
    () =>
      ingredientNeeds(
        (meals ?? []).map((m) => ({
          ingredients: m.ingredients,
          portions: m.portions,
          perDay: perDay.get(m.id) ?? 0,
        })),
        days,
      ),
    [meals, perDay, days],
  );

  if (meals === undefined || foods === undefined) {
    return (
      <Screen title="Préparer" back backFallback={back}>
        <Loading />
      </Screen>
    );
  }
  if (meals.length === 0) {
    return (
      <Screen title="Préparer" back backFallback={back}>
        <EmptyState
          title="Pas encore de plat"
          description="Crée un plat dans l’onglet Plats, ou ajoute tes ingrédients à la main dans la liste."
        />
      </Screen>
    );
  }

  // Products of the chosen dishes that still exist, by name.
  const lines = [...needs]
    .flatMap(([foodId, need]) => {
      const food = foodsById.get(foodId);
      return food ? [{ food, need, buy: toBuy(need, left.get(foodId) ?? 0) }] : [];
    })
    .sort((a, b) => a.food.name.localeCompare(b.food.name));
  const toAdd = lines.filter((l) => l.buy > 0);

  async function addToList() {
    for (const line of toAdd) {
      await addShoppingItem({ name: line.food.name, foodId: line.food.id, neededG: line.buy });
    }
    void navigate(back, { replace: true });
  }

  return (
    <Screen title="Préparer" back backFallback={back}>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <h2 className="text-lg leading-tight headline">Pour combien de jours ?</h2>
        <Stepper label="jours" value={days} min={1} max={MAX_DAYS} onChange={setDays}>
          <span className="w-10 text-center text-[2rem] leading-none numeral tabular-nums">{days}</span>
        </Stepper>
      </div>

      <h2 className="mt-4 text-lg leading-tight headline">Plats</h2>
      <p className="text-[13px] font-semibold text-muted">Combien de fois par jour tu le manges.</p>
      <ul className="mt-1 divide-y divide-line border-b border-line">
        {meals.map((meal) => {
          const count = perDay.get(meal.id) ?? 0;
          return (
            <li key={meal.id} className="flex min-h-14 items-center gap-2 py-1">
              <span className={`min-w-0 flex-1 truncate font-bold ${count === 0 ? 'text-muted' : ''}`}>
                {meal.name}
              </span>
              <Stepper
                label={meal.name}
                value={count}
                min={0}
                max={MAX_PER_DAY}
                onChange={(value) => setPerDay((current) => new Map(current).set(meal.id, value))}
              >
                <span className="w-14 text-center text-sm font-black tabular-nums">{count} / jour</span>
              </Stepper>
            </li>
          );
        })}
      </ul>

      {lines.length > 0 && (
        <>
          <h2 className="mt-5 text-lg leading-tight headline">Ce qu’il te reste</h2>
          <div className="flex text-xs font-extrabold text-muted">
            <span className="flex-1">Tape ce que tu as déjà à la maison</span>
            <span className="w-16 text-right">à acheter</span>
          </div>
          <ul className="divide-y divide-line border-b border-line">
            {lines.map(({ food, need, buy }) => (
              <li key={food.id} className="flex min-h-14 items-center gap-2 py-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{food.name}</span>
                  <span className="block text-xs font-semibold text-muted">
                    il en faut {formatGrams(Math.ceil(need))} g
                  </span>
                </span>
                <span className="text-xs font-extrabold text-muted">reste</span>
                <NumericInput
                  aria-label={`Ce qu’il te reste de ${food.name}, en grammes`}
                  value={left.get(food.id) ?? 0}
                  onCommit={(value) => setLeft((current) => new Map(current).set(food.id, value))}
                  className="h-11 w-20 shrink-0 bg-surface text-center text-lg font-black tabular-nums outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
                />
                <span
                  className={`w-16 text-right text-sm font-black tabular-nums ${buy === 0 ? 'text-muted' : ''}`}
                >
                  {formatGrams(buy)} g
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Button className="mt-5 w-full" disabled={toAdd.length === 0} onClick={() => void addToList()}>
        {toAdd.length === 0
          ? 'Rien à acheter'
          : `Ajouter à la liste (${toAdd.length} produit${toAdd.length > 1 ? 's' : ''})`}
      </Button>
      <div className="h-6" />
    </Screen>
  );
}

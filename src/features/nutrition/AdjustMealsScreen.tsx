import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { CloseIcon, LockIcon, PlusIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { NumericInput } from '../../components/NumericInput';
import { Screen } from '../../components/Screen';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useToday } from '../../components/useToday';
import type { Food } from '../../db/db';
import { getGoals } from '../../db/goals';
import { addEntry, addMealEntry, listEntriesForDate } from '../../db/logEntries';
import { summarizeWithFoods } from '../../db/meals';
import { planQuantities, type PlanItem } from '../../domain/mealPlanner';
import {
  computeMacros,
  defaultSlotForHour,
  MEAL_SLOTS,
  sumMacros,
  type Goals,
  type Macros,
  type MealSlot,
} from '../../domain/nutrition';
import { formatGrams, formatMacro } from '../../lib/format';
import { SLOT_LABELS } from './labels';
import { diaryPath, parseDateParam } from './params';
import { usePickerItems, type PickerData } from './pickerItems';
import { ProductPicker } from './ProductPicker';

/** A dish or product you still plan to eat today. */
type Planned = { uid: number; kind: 'meal'; mealId: number } | { uid: number; kind: 'food'; foodId: number };

/** One product of a planned dish (or a product alone), as the planner sees it. */
interface Line {
  key: string;
  planned: Planned;
  food: Food;
  baseGrams: number;
}

/** Quantity of reference for a product eaten alone: the last amount logged, else 100 g. */
const DEFAULT_FOOD_G = 100;

function linesFor(planned: readonly Planned[], data: PickerData): Line[] {
  return planned.flatMap((p): Line[] => {
    if (p.kind === 'food') {
      const food = data.foodsById.get(p.foodId);
      const recent = data.items.find((i) => i.kind === 'food' && i.id === p.foodId)?.recent;
      return food
        ? [{ key: `${p.uid}`, planned: p, food, baseGrams: recent?.lastGrams ?? DEFAULT_FOOD_G }]
        : [];
    }
    const item = data.items.find((i) => i.kind === 'meal' && i.id === p.mealId);
    if (item?.kind !== 'meal') return [];
    // One portion of the dish; a product that no longer exists is left out.
    return item.meal.ingredients.flatMap((ingredient, index): Line[] => {
      const food = data.foodsById.get(ingredient.foodId);
      return food
        ? [
            {
              key: `${p.uid}:${index}`,
              planned: p,
              food,
              baseGrams: ingredient.grams / item.summary.portionCount,
            },
          ]
        : [];
    });
  });
}

/** /nutrition/adjust?date= — quantities for the meals left today, under the calorie goal. */
export function AdjustMealsScreen() {
  const [params] = useSearchParams();
  const today = useToday();
  const date = parseDateParam(params.get('date')) ?? today;
  const navigate = useNavigate();
  const entries = useLiveQuery(() => listEntriesForDate(date), [date]);
  const goals = useLiveQuery(getGoals);
  const data = usePickerItems(true);

  const [planned, setPlanned] = useState<Planned[]>([]);
  const [nextUid, setNextUid] = useState(1);
  const [locks, setLocks] = useState<ReadonlyMap<string, number>>(new Map());
  const [slot, setSlot] = useState<MealSlot>(() => defaultSlotForHour(new Date().getHours()));
  const [picking, setPicking] = useState(false);
  const back = diaryPath(date);

  const eaten = useMemo(() => sumMacros((entries ?? []).map((e) => e.macros)), [entries]);
  const lines = useMemo(() => (data ? linesFor(planned, data) : []), [planned, data]);
  const plan = useMemo(() => {
    if (goals?.kcal === undefined) return undefined;
    const items: PlanItem[] = lines.map((l) => ({
      key: l.key,
      per100g: l.food.per100g,
      baseGrams: l.baseGrams,
      lockedGrams: locks.get(l.key),
    }));
    return planQuantities(items, {
      kcal: goals.kcal - eaten.kcal,
      protein: goals.protein === undefined ? undefined : goals.protein - eaten.protein,
      carbs: goals.carbs === undefined ? undefined : goals.carbs - eaten.carbs,
      fat: goals.fat === undefined ? undefined : goals.fat - eaten.fat,
    });
  }, [lines, locks, goals, eaten]);

  if (entries === undefined || goals === undefined || data === undefined) {
    return (
      <Screen title="Ajuster mes repas" back backFallback={back}>
        <Loading />
      </Screen>
    );
  }
  if (goals.kcal === undefined || !plan) {
    return (
      <Screen title="Ajuster mes repas" back backFallback={back}>
        <EmptyState
          title="Pas d’objectif de calories"
          description="Définis ton objectif de calories (Réglages › Objectifs) pour que l’app calcule tes repas."
        />
      </Screen>
    );
  }

  function add(key: string) {
    const [kind, id] = key.split(':');
    const uid = nextUid;
    setNextUid(uid + 1);
    setPlanned((list) => [
      ...list,
      kind === 'meal' ? { uid, kind: 'meal', mealId: Number(id) } : { uid, kind: 'food', foodId: Number(id) },
    ]);
    setPicking(false);
  }

  if (picking || planned.length === 0) {
    return (
      <Screen
        title={planned.length === 0 ? 'Ajuster mes repas' : 'Ajouter au calcul'}
        back
        {...(planned.length === 0 ? { backFallback: back } : { onBack: () => setPicking(false) })}
      >
        <p className="mb-2 text-sm font-semibold text-muted">
          Il te reste{' '}
          <b className="text-fg">{formatMacro('kcal', Math.max(0, goals.kcal - eaten.kcal))} kcal</b>
          {goals.protein !== undefined && (
            <>
              {' '}
              et{' '}
              <b className="text-fg">
                {formatMacro('protein', Math.max(0, goals.protein - eaten.protein))} g
              </b>{' '}
              de protéines
            </>
          )}
          . Qu’est-ce que tu vas encore manger ?
        </p>
        <ProductPicker data={data} onSelect={add} onCreateFood={() => navigate('/nutrition/foods/new')} />
      </Screen>
    );
  }

  const dayTotal = sumMacros([eaten, plan.totals]);
  const toggleLock = (key: string, grams: number) =>
    setLocks((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      else next.set(key, grams);
      return next;
    });
  const setGrams = (key: string, grams: number) => setLocks((current) => new Map(current).set(key, grams));

  async function save() {
    if (!plan) return;
    for (const p of planned) {
      const own = lines.filter((l) => l.planned === p);
      if (p.kind === 'food') {
        const line = own[0];
        const grams = line ? (plan.grams.get(line.key) ?? 0) : 0;
        if (line && grams > 0) await addEntry({ date, slot, food: line.food, grams });
        continue;
      }
      const meal = data?.items.find((i) => i.kind === 'meal' && i.id === p.mealId);
      if (meal?.kind !== 'meal') continue;
      // The dish as adjusted, for one serving; the saved recipe is not changed.
      const ingredients = own.map((l) => ({ foodId: l.food.id, grams: plan.grams.get(l.key) ?? 0 }));
      const summary = summarizeWithFoods({ ingredients }, data?.foodsById ?? new Map());
      if (summary.per100g) {
        await addMealEntry({ date, slot, meal: meal.meal, summary, serving: { portions: 1 } });
      }
    }
    void navigate(back, { replace: true });
  }

  return (
    <Screen title="Ajuster mes repas" back backFallback={back}>
      <DayBand total={dayTotal} goals={goals} />
      {!plan.fits && (
        <p className="mt-2 text-sm font-bold text-danger">
          Même au minimum, tu dépasses tes calories : débloque un produit ou retire un plat.
        </p>
      )}

      {planned.map((p) => {
        const own = lines.filter((l) => l.planned === p);
        const title =
          p.kind === 'meal'
            ? (data.items.find((i) => i.kind === 'meal' && i.id === p.mealId)?.name ?? 'Plat supprimé')
            : (own[0]?.food.name ?? 'Produit supprimé');
        return (
          <section key={p.uid} className="mt-5" aria-label={title}>
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 truncate text-xl leading-tight headline">{title}</h2>
              <button
                type="button"
                aria-label={`Retirer ${title}`}
                className="flex size-11 shrink-0 items-center justify-center text-muted active:bg-surface"
                onClick={() => setPlanned((list) => list.filter((other) => other.uid !== p.uid))}
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <ul className="divide-y divide-line border-b border-line">
              {own.map((line) => {
                const grams = plan.grams.get(line.key) ?? 0;
                const locked = locks.has(line.key);
                const macros = computeMacros(line.food.per100g, grams);
                return (
                  <li key={line.key} className="flex min-h-14 items-center gap-2 py-1.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{line.food.name}</span>
                      <span className="block text-xs font-semibold text-muted tabular-nums">
                        {formatMacro('kcal', macros.kcal)} kcal · {formatMacro('protein', macros.protein)} g
                        prot.
                        {p.kind === 'meal' && ` · recette ${formatGrams(Math.round(line.baseGrams))} g`}
                      </span>
                    </span>
                    <NumericInput
                      aria-label={`Grammes de ${line.food.name}`}
                      value={grams}
                      onCommit={(value) => setGrams(line.key, value)}
                      className="h-11 w-20 shrink-0 bg-surface text-center text-lg font-black tabular-nums outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
                    />
                    <button
                      type="button"
                      aria-pressed={locked}
                      aria-label={
                        locked
                          ? `Débloquer ${line.food.name}`
                          : `Bloquer ${line.food.name} à ${formatGrams(grams)} g`
                      }
                      onClick={() => toggleLock(line.key, grams)}
                      className={`flex size-11 shrink-0 items-center justify-center ${
                        locked ? 'bg-paper text-ink' : 'border-2 border-line text-muted active:bg-surface'
                      }`}
                    >
                      <LockIcon locked={locked} className="size-5" strokeWidth={2.2} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="mt-2 text-xs font-semibold text-muted">
        Cadenas fermé : la quantité est fixée (taper une quantité la fixe aussi). Les autres sont recalculées
        : d’abord rester sous tes calories, puis atteindre tes protéines, puis les glucides et les lipides.
      </p>

      <Button variant="secondary" className="mt-4 w-full" onClick={() => setPicking(true)}>
        <PlusIcon className="size-5" /> Ajouter un plat ou un produit
      </Button>

      <div className="mt-6">
        <SegmentedControl
          label="Repas"
          dense
          options={MEAL_SLOTS.map((s) => ({ value: s, label: SLOT_LABELS[s] }))}
          value={slot}
          onChange={setSlot}
        />
      </div>
      <Button className="mt-3 w-full" onClick={() => void save()}>
        Ajouter au journal
      </Button>
      <div className="h-6" />
    </Screen>
  );
}

const BAND: { key: keyof Macros; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: '' },
  { key: 'protein', label: 'Prot.', unit: ' g' },
  { key: 'carbs', label: 'Gluc.', unit: ' g' },
  { key: 'fat', label: 'Lip.', unit: ' g' },
];

/** The day as it would end with the planned meals, against the goals. */
function DayBand({ total, goals }: { total: Macros; goals: Goals }) {
  return (
    <section aria-label="Ta journée avec ces repas" className="bleed bg-paper py-3 text-ink">
      <dl className="grid grid-cols-4 gap-2">
        {BAND.map(({ key, label, unit }) => {
          const goal = goals[key];
          const reached =
            goal !== undefined && (key === 'kcal' ? total[key] <= goal + 0.5 : total[key] >= goal - 0.5);
          return (
            <div key={key} className="min-w-0">
              <dt className="text-xs font-extrabold">{label}</dt>
              <dd className="text-[1.35rem] leading-tight numeral tabular-nums">
                {formatMacro(key, total[key])}
              </dd>
              <dd className="text-xs font-bold text-ink/72">
                {goal === undefined ? '—' : `/ ${formatMacro(key, goal)}${unit}`}
                {reached && key !== 'carbs' && key !== 'fat' ? ' ✓' : ''}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-1.5 text-xs font-bold text-ink/72">Ta journée avec les repas ci-dessous</p>
    </section>
  );
}

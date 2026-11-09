import { useState } from 'react';
import { useToday } from '../../components/useToday';
import { useSearchParams } from 'react-router';
import { PlusIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { useGoBack } from '../../components/useGoBack';
import { setFavorite } from '../../db/foods';
import { addEntry, addMealEntry, addQuickEntry, itemKey } from '../../db/logEntries';
import { setMealFavorite } from '../../db/meals';
import { defaultSlotForHour } from '../../domain/nutrition';
import { FoodForm } from './FoodForm';
import { SLOT_LABELS } from './labels';
import { diaryPath, parseDateParam, parseSlotParam } from './params';
import { initialServing, mealTarget, usePickerItems, type PickerItem } from './pickerItems';
import { PortionSheet, type PortionTarget, type PortionValue } from './PortionSheet';
import { ProductPicker } from './ProductPicker';
import { QuickEntrySheet } from './QuickEntrySheet';

function targetFor(item: PickerItem): PortionTarget {
  return item.kind === 'meal'
    ? mealTarget(item.meal, item.summary)
    : { name: item.name, brand: item.brand, per100g: item.food.per100g };
}

export function AddEntryScreen() {
  const [params] = useSearchParams();
  const today = useToday();
  const date = parseDateParam(params.get('date')) ?? today;
  const slot = parseSlotParam(params.get('slot')) ?? defaultSlotForHour(new Date().getHours());
  const goBack = useGoBack(diaryPath(date));

  const data = usePickerItems(true);
  const [selectedKey, setSelectedKey] = useState<string>();
  /** Initial name of the product being created; undefined when not creating. */
  const [creatingName, setCreatingName] = useState<string>();
  const [quick, setQuick] = useState(false);

  if (creatingName !== undefined) {
    return (
      <FoodForm
        initialName={creatingName}
        onExistingFood={(id) => {
          setCreatingName(undefined);
          setSelectedKey(itemKey('food', id));
        }}
        onSaved={(id) => {
          setCreatingName(undefined);
          // The sheet opens as soon as the live query has picked up the new product.
          setSelectedKey(itemKey('food', id));
        }}
        onCancel={() => setCreatingName(undefined)}
      />
    );
  }

  const selected = data?.items.find((i) => i.key === selectedKey);

  async function handleSubmit(value: PortionValue) {
    if (!selected) return;
    const chosenSlot = value.slot ?? slot;
    if (selected.kind === 'meal') {
      await addMealEntry({
        date,
        slot: chosenSlot,
        meal: selected.meal,
        summary: selected.summary,
        serving: value.portions !== undefined ? { portions: value.portions } : { grams: value.grams },
      });
    } else {
      await addEntry({ date, slot: chosenSlot, food: selected.food, grams: value.grams });
    }
    goBack();
  }

  return (
    <Screen title={`Ajouter · ${SLOT_LABELS[slot]}`} back backFallback={diaryPath(date)}>
      <button
        type="button"
        onClick={() => setQuick(true)}
        className="mb-3 flex min-h-14 w-full items-center justify-between gap-3 border-y border-line text-left active:opacity-60"
      >
        <span>
          <span className="block font-bold">Ajout rapide</span>
          <span className="block text-[13px] font-medium text-muted">
            Calories et macros sans produit, pour un resto
          </span>
        </span>
        <PlusIcon className="size-5 shrink-0" strokeWidth={2.6} />
      </button>
      {data === undefined ? (
        <Loading />
      ) : (
        <ProductPicker data={data} onSelect={setSelectedKey} onCreateFood={setCreatingName} />
      )}

      <PortionSheet
        target={selected && targetFor(selected)}
        formKey={selectedKey ?? ''}
        initial={selected ? initialServing(selected) : { grams: 100 }}
        initialSlot={slot}
        submitLabel="Ajouter"
        favorite={selected?.favorite}
        onToggleFavorite={() => {
          if (!selected) return;
          void (selected.kind === 'meal' ? setMealFavorite : setFavorite)(selected.id, !selected.favorite);
        }}
        onSubmit={handleSubmit}
        onClose={() => setSelectedKey(undefined)}
      />
      <QuickEntrySheet
        open={quick}
        initialSlot={slot}
        submitLabel="Ajouter"
        onSubmit={async (value) => {
          await addQuickEntry({ date, ...value });
          goBack();
        }}
        onClose={() => setQuick(false)}
      />
    </Screen>
  );
}

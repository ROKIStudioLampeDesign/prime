import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { EmptyState } from '../../components/EmptyState';
import { PlusIcon, StarIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { iconButton, Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import type { Meal } from '../../db/db';
import { createMeal, deleteMeal, duplicateMeal, updateMeal } from '../../db/meals';
import { moveItem, summarizeMeal, validateMeal } from '../../domain/meal';
import { parseDecimal } from '../../domain/number';
import { roundTo } from '../../domain/nutrition';
import { formatGrams, toInputValue } from '../../lib/format';
import { FoodForm } from './FoodForm';
import { PhotoPicker } from './PhotoPicker';
import { usePickerItems } from './pickerItems';
import { PortionSheet } from './PortionSheet';
import { IngredientItem, MealTotals } from './MealParts';
import { ProductPicker } from './ProductPicker';

interface MealFormProps {
  /** The meal to edit; omitted to create a new one. */
  meal?: Meal;
  onSaved: (id: number) => void;
  onDeleted?: () => void;
  onDuplicated?: (id: number) => void;
}

interface IngredientRow {
  /** Stable React key, independent of position (rows can be reordered). */
  uid: string;
  foodId: number;
  gramsText: string;
}

type Step =
  { kind: 'form' } | { kind: 'pick'; selectedFoodId?: number } | { kind: 'createFood'; name: string };

let nextUid = 0;
const newUid = () => `ing-${++nextUid}`;

/** Parses an optional positive field: '' → undefined, garbage → NaN (reported by validateMeal). */
const optionalNumber = (text: string) => parseDecimal(text);

export function MealForm({ meal, onSaved, onDeleted, onDuplicated }: MealFormProps) {
  const picker = usePickerItems(false);
  const [name, setName] = useState(meal?.name ?? '');
  const [photo, setPhoto] = useState<Blob | undefined>(meal?.photo);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [favorite, setFavorite] = useState(meal?.favorite === 1);
  const [portionsText, setPortionsText] = useState(toInputValue(meal?.portions));
  const [cookedText, setCookedText] = useState(toInputValue(meal?.cookedWeight));
  const [rows, setRows] = useState<IngredientRow[]>(
    () =>
      meal?.ingredients.map((i) => ({ uid: newUid(), foodId: i.foodId, gramsText: toInputValue(i.grams) })) ??
      [],
  );
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (picker === undefined) {
    return (
      <Screen title={meal ? 'Modifier le plat' : 'Nouveau plat'} back backFallback="/nutrition/meals">
        <Loading />
      </Screen>
    );
  }
  const { foodsById } = picker;

  const gramsValues = rows.map((r) => parseDecimal(r.gramsText) ?? NaN);
  const portions = optionalNumber(portionsText);
  const cookedWeight = optionalNumber(cookedText);
  const validation = validateMeal({ name, ingredientGrams: gramsValues, portions, cookedWeight });
  const summary = summarizeMeal({
    ingredients: rows.map((r, i) => ({
      grams: gramsValues[i] ?? 0,
      per100g: foodsById.get(r.foodId)?.per100g,
    })),
    cookedWeight: validation.cookedWeight ? undefined : cookedWeight,
    portions: validation.portions ? undefined : portions,
  });

  function updateRow(uid: string, gramsText: string) {
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, gramsText } : r)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!validation.valid || saving || photoBusy) return;
    setSaving(true);
    try {
      const input = {
        name,
        photo,
        favorite,
        ingredients: rows.map((r, i) => ({ foodId: r.foodId, grams: gramsValues[i] ?? 0 })),
        portions,
        cookedWeight,
      };
      if (meal) {
        await updateMeal(meal.id, input);
        onSaved(meal.id);
      } else {
        onSaved(await createMeal(input));
      }
    } finally {
      setSaving(false);
    }
  }

  if (step.kind === 'createFood') {
    return (
      <FoodForm
        initialName={step.name}
        onExistingFood={(id) => setStep({ kind: 'pick', selectedFoodId: id })}
        onSaved={(id) => setStep({ kind: 'pick', selectedFoodId: id })}
        onCancel={() => setStep({ kind: 'pick' })}
      />
    );
  }

  if (step.kind === 'pick') {
    const selectedFood = step.selectedFoodId !== undefined ? foodsById.get(step.selectedFoodId) : undefined;
    return (
      <Screen title="Ajouter un ingrédient" back onBack={() => setStep({ kind: 'form' })}>
        <ProductPicker
          data={picker}
          onSelect={(key) => setStep({ kind: 'pick', selectedFoodId: Number(key.split(':')[1]) })}
          onCreateFood={(initialName) => setStep({ kind: 'createFood', name: initialName })}
        />
        <PortionSheet
          target={
            selectedFood && {
              name: selectedFood.name,
              brand: selectedFood.brand,
              per100g: selectedFood.per100g,
            }
          }
          formKey={String(step.selectedFoodId)}
          initial={{ grams: 100 }}
          submitLabel="Ajouter au plat"
          onSubmit={async ({ grams }) => {
            if (!selectedFood) return;
            setRows((rs) => [
              ...rs,
              { uid: newUid(), foodId: selectedFood.id, gramsText: toInputValue(grams) },
            ]);
            setStep({ kind: 'form' });
          }}
          onClose={() => setStep({ kind: 'pick' })}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={meal ? 'Modifier le plat' : 'Nouveau plat'}
      back
      backFallback="/nutrition/meals"
      actions={
        <button
          type="button"
          aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={favorite}
          className={`${iconButton} -mr-3 ${favorite ? 'text-accent' : ''}`}
          onClick={() => setFavorite(!favorite)}
        >
          <StarIcon filled={favorite} />
        </button>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <PhotoPicker
          photo={photo}
          onChange={setPhoto}
          alt={name || 'Photo du plat'}
          onBusyChange={setPhotoBusy}
        />
        <TextField
          label="Nom du plat"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoCapitalize="sentences"
          error={submitted && validation.name ? 'Obligatoire' : undefined}
        />

        <section aria-labelledby="ingredients-title">
          <h2 id="ingredients-title" className="mb-2 font-semibold">
            Ingrédients
          </h2>
          {rows.length === 0 ? (
            <EmptyState
              title="Aucun ingrédient"
              description="Ajoute les produits qui composent ce plat, avec leur quantité crue."
            />
          ) : (
            <ol className="flex flex-col gap-2">
              {rows.map((row, index) => (
                <IngredientItem
                  key={row.uid}
                  gramsText={row.gramsText}
                  food={foodsById.get(row.foodId)}
                  grams={gramsValues[index] ?? NaN}
                  invalid={
                    (submitted || row.gramsText.trim() !== '') && validation.invalidGrams.includes(index)
                  }
                  isFirst={index === 0}
                  isLast={index === rows.length - 1}
                  onGramsChange={(text) => updateRow(row.uid, text)}
                  onMove={(delta) => setRows((rs) => moveItem(rs, index, index + delta))}
                  onRemove={() => setRows((rs) => rs.filter((r) => r.uid !== row.uid))}
                />
              ))}
            </ol>
          )}
          {submitted && validation.ingredients && (
            <p className="mt-2 text-xs text-danger">Ajoute au moins un ingrédient.</p>
          )}
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setStep({ kind: 'pick' })}>
            <PlusIcon className="size-5" /> Ajouter un ingrédient
          </Button>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Portions (facult.)"
            inputMode="decimal"
            autoComplete="off"
            value={portionsText}
            onChange={(e) => setPortionsText(e.target.value)}
            error={validation.portions ? 'Nombre positif attendu' : undefined}
          />
          <TextField
            label="Poids cuit (facult.)"
            suffix="g"
            inputMode="decimal"
            autoComplete="off"
            value={cookedText}
            onChange={(e) => setCookedText(e.target.value)}
            error={validation.cookedWeight ? 'Nombre positif attendu' : undefined}
          />
        </div>
        <p className="-mt-2 text-xs text-muted">
          Pèse le plat fini pour pouvoir noter des grammes précis. Sans poids cuit, le poids cru des
          ingrédients est utilisé ({formatGrams(roundTo(summary.rawWeight, 0))} g).
        </p>

        <MealTotals summary={summary} />

        <Button
          type="submit"
          disabled={saving || photoBusy || (submitted && !validation.valid)}
          className="mt-2"
        >
          {meal ? 'Enregistrer' : 'Créer le plat'}
        </Button>
        {meal && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const id = await duplicateMeal(meal.id);
                onDuplicated?.(id);
              }}
            >
              Dupliquer
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Supprimer
            </Button>
          </div>
        )}
      </form>

      <ConfirmSheet
        open={confirmDelete}
        title={`Supprimer « ${meal?.name ?? ''} » ?`}
        message="Le plat disparaîtra de ta liste. Ce que tu as déjà noté dans ton journal est conservé."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (!meal) return;
          setConfirmDelete(false);
          onDeleted?.();
          await deleteMeal(meal.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

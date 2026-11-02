import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { BarcodeIcon, StarIcon } from '../../components/icons';
import { iconButton, Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import type { Food } from '../../db/db';
import { createFood, deleteFood, findFoodByBarcode, updateFood } from '../../db/foods';
import { parseDecimal } from '../../domain/number';
import {
  estimateKcal,
  validatePer100g,
  type FoodValueError,
  type Per100gField,
  type Per100gInput,
} from '../../domain/nutrition';
import { formatMacro, toInputValue } from '../../lib/format';
import { downloadProductImage, lookupBarcode } from '../../lib/openFoodFacts';
import { PhotoPicker } from './PhotoPicker';

interface FoodFormProps {
  /** The food to edit; omitted to create a new one. */
  food?: Food;
  initialName?: string;
  onSaved: (id: number) => void;
  onCancel?: () => void;
  /** Called after the food was deleted (edit mode only). */
  onDeleted?: () => void;
  /** A scanned barcode matches an existing product: open it instead of creating a duplicate. */
  onExistingFood?: (id: number) => void;
}

// The scanner pulls in zxing (~400 kB): only load it when the user opens it.
const BarcodeScanner = lazy(() => import('./BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })));

type LookupState =
  | { status: 'loading' | 'found' | 'notFound' | 'offline' | 'timeout' | 'error'; barcode: string }
  | { status: 'exists'; barcode: string; name: string };

const LOOKUP_MESSAGES: Record<Exclude<LookupState['status'], 'exists'>, string> = {
  loading: 'Recherche sur Open Food Facts…',
  found: 'Valeurs importées d’Open Food Facts : vérifie-les avant d’enregistrer.',
  notFound: 'Produit introuvable sur Open Food Facts : complète la fiche à la main.',
  offline:
    'Hors connexion : impossible d’interroger Open Food Facts. Le code-barres est noté, complète la fiche.',
  timeout: 'Open Food Facts ne répond pas. Réessaie plus tard ou complète la fiche à la main.',
  error: 'Erreur en interrogeant Open Food Facts. Complète la fiche à la main.',
};

const FIELDS: { key: Per100gField; label: string; suffix: string; optional?: boolean }[] = [
  { key: 'kcal', label: 'Calories', suffix: 'kcal' },
  { key: 'protein', label: 'Protéines', suffix: 'g' },
  { key: 'carbs', label: 'Glucides', suffix: 'g' },
  { key: 'sugars', label: 'dont sucres', suffix: 'g', optional: true },
  { key: 'fat', label: 'Lipides', suffix: 'g' },
  { key: 'fiber', label: 'Fibres', suffix: 'g', optional: true },
];

function errorMessage(field: Per100gField, error: FoodValueError): string {
  switch (error) {
    case 'required':
      return 'Obligatoire';
    case 'negative':
      return 'Nombre positif attendu';
    case 'tooHigh':
      return field === 'kcal' ? 'Maximum 900 kcal' : 'Maximum 100 g';
    case 'sugarsExceedCarbs':
      return 'Ne peut pas dépasser les glucides';
  }
}

type ValueTexts = Record<Per100gField, string>;

function initialTexts(food?: Food): ValueTexts {
  const p = food?.per100g;
  return {
    kcal: toInputValue(p?.kcal),
    protein: toInputValue(p?.protein),
    carbs: toInputValue(p?.carbs),
    sugars: toInputValue(p?.sugars),
    fat: toInputValue(p?.fat),
    fiber: toInputValue(p?.fiber),
  };
}

export function FoodForm({
  food,
  initialName = '',
  onSaved,
  onCancel,
  onDeleted,
  onExistingFood,
}: FoodFormProps) {
  const [name, setName] = useState(food?.name ?? initialName.trim());
  const [brand, setBrand] = useState(food?.brand ?? '');
  const [barcode, setBarcode] = useState(food?.barcode ?? '');
  const [values, setValues] = useState<ValueTexts>(() => initialTexts(food));
  const [photo, setPhoto] = useState<Blob | undefined>(food?.photo);
  const [favorite, setFavorite] = useState(food?.favorite === 1);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lookup, setLookup] = useState<LookupState>();
  /** Nutrients Open Food Facts didn't provide: flagged so the user completes them. */
  const [missing, setMissing] = useState<Per100gField[]>([]);

  const parsed: Per100gInput = {};
  for (const { key } of FIELDS) {
    const v = parseDecimal(values[key]);
    if (v !== undefined) parsed[key] = v;
  }
  const validation = validatePer100g(parsed);
  const nameError = name.trim() === '' ? 'Obligatoire' : undefined;
  const canSave = !nameError && validation.value !== undefined;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!canSave || !validation.value || saving) return;
    setSaving(true);
    try {
      const input = { name, brand, barcode, photo, per100g: validation.value, favorite };
      if (food) {
        await updateFood(food.id, input);
        onSaved(food.id);
      } else {
        onSaved(await createFood(input));
      }
    } finally {
      setSaving(false);
    }
  }

  /** Scanned or typed barcode: open the existing product, else prefill from Open Food Facts for review. */
  async function handleBarcode(code: string) {
    setScanning(false);
    const existing = await findFoodByBarcode(code);
    if (existing) {
      if (onExistingFood) onExistingFood(existing.id);
      else setLookup({ status: 'exists', barcode: code, name: existing.name });
      return;
    }
    setBarcode(code);
    setLookup({ status: 'loading', barcode: code });
    const result = await lookupBarcode(code);
    if (result.status !== 'found') {
      setLookup({ status: result.status, barcode: code });
      return;
    }
    const { draft } = result;
    if (draft.name) setName(draft.name);
    if (draft.brand) setBrand(draft.brand);
    setValues((v) => {
      const next = { ...v };
      for (const { key } of FIELDS) next[key] = toInputValue(draft.per100g[key]);
      return next;
    });
    setMissing(draft.missing);
    setLookup({ status: 'found', barcode: code });
    if (draft.imageUrl && !photo) {
      setPhotoBusy(true);
      const image = await downloadProductImage(draft.imageUrl);
      // Don't overwrite a photo the user picked meanwhile.
      if (image) setPhoto((current) => current ?? image);
      setPhotoBusy(false);
    }
  }

  async function handleDelete() {
    if (!food) return;
    setConfirmDelete(false);
    onDeleted?.();
    await deleteFood(food.id);
  }

  return (
    <Screen
      title={food ? 'Modifier le produit' : 'Nouveau produit'}
      back
      backFallback="/nutrition/foods"
      onBack={onCancel}
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
        {!food && (
          <Button
            variant="secondary"
            onClick={() => setScanning(true)}
            disabled={lookup?.status === 'loading'}
          >
            <BarcodeIcon className="size-5" /> Scanner un code-barres
          </Button>
        )}
        {lookup && (
          <p
            role="status"
            className={`-mt-1 rounded-xl px-3 py-2 text-sm ${
              lookup.status === 'found' || lookup.status === 'loading'
                ? 'bg-surface text-fg'
                : 'bg-danger/10 text-danger'
            }`}
          >
            {lookup.status === 'exists'
              ? `Ce code-barres correspond déjà à « ${lookup.name} ».`
              : LOOKUP_MESSAGES[lookup.status]}
          </p>
        )}
        <PhotoPicker
          photo={photo}
          onChange={setPhoto}
          alt={name || 'Photo du produit'}
          onBusyChange={setPhotoBusy}
        />

        <TextField
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoCapitalize="sentences"
          enterKeyHint="next"
          error={submitted ? nameError : undefined}
        />
        <TextField
          label="Marque (facultatif)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          enterKeyHint="next"
        />

        <fieldset>
          <legend className="mb-2 font-semibold">Valeurs pour 100 g</legend>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, suffix, optional }) => {
              const error = validation.errors[key];
              // Errors on untouched empty fields wait for a save attempt; typed mistakes show live.
              const show = error && (submitted || values[key].trim() !== '');
              return (
                <TextField
                  key={key}
                  label={optional ? `${label} (facult.)` : label}
                  suffix={suffix}
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  value={values[key]}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  error={show ? errorMessage(key, error) : undefined}
                  hint={
                    missing.includes(key) && values[key].trim() === ''
                      ? 'Absent d’Open Food Facts : à compléter'
                      : undefined
                  }
                />
              );
            })}
          </div>
        </fieldset>

        {validation.value && validation.kcalMismatch && (
          <p role="status" className="rounded-xl border border-line bg-surface p-3 text-sm">
            <span className="font-semibold">Calories inhabituelles.</span>{' '}
            <span className="text-muted">
              D’après les macros (4 × P + 4 × G + 9 × L), on attendrait environ{' '}
              {formatMacro('kcal', estimateKcal(validation.value))} kcal. Vérifie l’étiquette (valeur en kJ
              ?).
            </span>
          </p>
        )}

        <TextField
          label="Code-barres (facultatif)"
          inputMode="numeric"
          autoComplete="off"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />

        <Button type="submit" disabled={saving || photoBusy || (submitted && !canSave)} className="mt-2">
          {food ? 'Enregistrer' : 'Créer le produit'}
        </Button>
        {food && (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Supprimer le produit
          </Button>
        )}
      </form>

      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onDetected={(code) => void handleBarcode(code)}
            onClose={() => setScanning(false)}
          />
        </Suspense>
      )}

      <ConfirmSheet
        open={confirmDelete}
        title={`Supprimer « ${food?.name ?? ''} » ?`}
        message="Le produit disparaîtra de ta liste. Les aliments déjà notés dans ton journal sont conservés."
        confirmLabel="Supprimer"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

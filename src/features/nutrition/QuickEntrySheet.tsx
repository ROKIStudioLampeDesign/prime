import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { parseDecimal } from '../../domain/number';
import {
  MAX_QUICK_GRAMS,
  MAX_QUICK_KCAL,
  MEAL_SLOTS,
  quickMacros,
  roundMacro,
  type Macros,
  type MealSlot,
  type QuickMacrosField,
} from '../../domain/nutrition';
import { formatMacro } from '../../lib/format';
import { SLOT_SHORT_LABELS } from './labels';

export interface QuickEntryValue {
  name: string;
  slot: MealSlot;
  macros: Macros;
}

interface QuickEntrySheetProps {
  open: boolean;
  /** Values of the entry being edited; empty fields when adding. */
  initial?: { name: string; slot: MealSlot; macros: Macros };
  initialSlot: MealSlot;
  submitLabel: string;
  onSubmit: (value: QuickEntryValue) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

/** Calories and macros typed in directly, without a product: a restaurant meal, a snack out. */
export function QuickEntrySheet({ open, onClose, ...form }: QuickEntrySheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Ajout rapide">
      {open && <QuickEntryForm {...form} />}
    </BottomSheet>
  );
}

const FIELDS: { key: QuickMacrosField; label: string; suffix: string }[] = [
  { key: 'kcal', label: 'Calories', suffix: 'kcal' },
  { key: 'protein', label: 'Protéines', suffix: 'g' },
  { key: 'carbs', label: 'Glucides', suffix: 'g' },
  { key: 'fat', label: 'Lipides', suffix: 'g' },
];

const shown = (key: QuickMacrosField, macros: Macros | undefined) =>
  macros && (key === 'kcal' || macros[key] > 0) ? formatMacro(key, roundMacro(key, macros[key])) : '';

function QuickEntryForm({
  initial,
  initialSlot,
  submitLabel,
  onSubmit,
  onDelete,
}: Omit<QuickEntrySheetProps, 'open' | 'onClose'>) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slot, setSlot] = useState(initial?.slot ?? initialSlot);
  const [text, setText] = useState<Record<QuickMacrosField, string>>({
    kcal: shown('kcal', initial?.macros),
    protein: shown('protein', initial?.macros),
    carbs: shown('carbs', initial?.macros),
    fat: shown('fat', initial?.macros),
  });
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const parsed = Object.fromEntries(
    FIELDS.map(({ key }) => [
      key,
      text[key].trim() === '' ? undefined : (parseDecimal(text[key]) ?? Number.NaN),
    ]),
  );
  const { value, errors } = quickMacros(parsed);

  const errorText = (key: QuickMacrosField) => {
    const error = errors[key];
    // "Required" waits for a submit attempt; a wrong value shows while typing.
    if (!error || (error === 'required' && !tried)) return undefined;
    if (error === 'required') return 'Indique au moins les calories';
    if (error === 'negative') return 'Entre un nombre positif';
    return key === 'kcal' ? `Maximum ${MAX_QUICK_KCAL} kcal` : `Maximum ${MAX_QUICK_GRAMS} g`;
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!value) return;
        void run(() => onSubmit({ name, slot, macros: value }));
      }}
    >
      <SegmentedControl
        label="Repas"
        options={MEAL_SLOTS.map((s) => ({ value: s, label: SLOT_SHORT_LABELS[s] }))}
        value={slot}
        onChange={setSlot}
        variant="tabs"
        dense
      />
      <div className="mt-3">
        <TextField
          label="Nom"
          placeholder="Resto, burger…"
          autoComplete="off"
          enterKeyHint="next"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {FIELDS.map(({ key, label, suffix }) => (
          <TextField
            key={key}
            label={key === 'kcal' ? label : `${label} (facultatif)`}
            suffix={suffix}
            inputMode="decimal"
            autoComplete="off"
            value={text[key]}
            onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
            error={errorText(key)}
          />
        ))}
      </div>
      <Button type="submit" className="mt-4 w-full" disabled={busy}>
        {submitLabel}
      </Button>
      {onDelete && (
        <Button variant="danger" className="mt-2 w-full" disabled={busy} onClick={() => void run(onDelete)}>
          Supprimer
        </Button>
      )}
    </form>
  );
}

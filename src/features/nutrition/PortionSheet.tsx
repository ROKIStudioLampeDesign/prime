import { useState, type FormEvent } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { StarIcon } from '../../components/icons';
import { iconButton } from '../../components/Screen';
import { parseDecimal } from '../../domain/number';
import { computeMacros, MEAL_SLOTS, type MealSlot, type Per100g } from '../../domain/nutrition';
import { formatMacro, toInputValue } from '../../lib/format';
import { SLOT_SHORT_LABELS } from './labels';

export interface PortionFood {
  name: string;
  brand?: string;
  per100g: Per100g;
}

interface PortionSheetProps {
  /** The sheet is open while a food is given. */
  food: PortionFood | undefined;
  /** Identity of what is being edited; the form resets when it changes. */
  formKey: string;
  initialGrams: number;
  initialSlot: MealSlot;
  submitLabel: string;
  onSubmit: (grams: number, slot: MealSlot) => Promise<void>;
  onDelete?: () => Promise<void>;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onClose: () => void;
}

const MAX_GRAMS = 5000;
const QUICK_ADD = [10, 50, 100];

export function PortionSheet(props: PortionSheetProps) {
  const { food, favorite, onToggleFavorite, onClose } = props;
  return (
    <BottomSheet
      open={food !== undefined}
      onClose={onClose}
      title={food?.name ?? ''}
      header={
        food && (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-lg leading-snug font-semibold">{food.name}</h2>
              <p className="text-sm text-muted">
                {food.brand && `${food.brand} · `}
                {formatMacro('kcal', food.per100g.kcal)} kcal / 100 g
              </p>
            </div>
            {onToggleFavorite && (
              <button
                type="button"
                aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                aria-pressed={favorite}
                className={`${iconButton} -mt-1 -mr-2 ${favorite ? 'text-accent' : ''}`}
                onClick={onToggleFavorite}
              >
                <StarIcon filled={favorite} />
              </button>
            )}
          </div>
        )
      }
    >
      {food && <PortionForm key={props.formKey} {...props} food={food} />}
    </BottomSheet>
  );
}

function PortionForm({
  food,
  initialGrams,
  initialSlot,
  submitLabel,
  onSubmit,
  onDelete,
}: PortionSheetProps & { food: PortionFood }) {
  const [gramsText, setGramsText] = useState(toInputValue(initialGrams));
  const [slot, setSlot] = useState(initialSlot);
  const [busy, setBusy] = useState(false);

  const parsed = parseDecimal(gramsText);
  const grams = parsed !== undefined && Number.isFinite(parsed) ? parsed : 0;
  const valid = grams > 0 && grams <= MAX_GRAMS;
  const preview = computeMacros(food.per100g, grams);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) void run(() => onSubmit(grams, slot));
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
        <legend className="sr-only">Repas</legend>
        {MEAL_SLOTS.map((s) => (
          <label
            key={s}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-xs font-semibold has-focus-visible:ring-2 has-focus-visible:ring-accent ${
              slot === s ? 'bg-accent text-accent-fg' : 'text-muted'
            }`}
          >
            <input
              type="radio"
              name="slot"
              value={s}
              checked={slot === s}
              onChange={() => setSlot(s)}
              className="sr-only"
            />
            {SLOT_SHORT_LABELS[s]}
          </label>
        ))}
      </fieldset>

      <div className="mt-4 flex items-center justify-center gap-2">
        <input
          aria-label="Quantité en grammes"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          value={gramsText}
          onChange={(e) => setGramsText(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          aria-invalid={gramsText !== '' && !valid}
          className={`w-36 rounded-xl border bg-bg py-2 text-center text-4xl font-bold tabular-nums outline-none focus:border-accent ${
            gramsText !== '' && !valid ? 'border-danger' : 'border-line'
          }`}
        />
        <span className="text-2xl font-semibold text-muted">g</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK_ADD.map((step) => (
          <Button
            key={step}
            variant="secondary"
            className="min-h-11 text-sm"
            onClick={() => setGramsText(toInputValue(Math.min(MAX_GRAMS, grams + step)))}
          >
            +{step} g
          </Button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-bg p-3" aria-live="polite">
        <p className="text-center">
          <span className="text-2xl font-bold tabular-nums">{formatMacro('kcal', preview.kcal)}</span>
          <span className="text-sm text-muted"> kcal</span>
        </p>
        <dl className="mt-2 grid grid-cols-4 text-center text-xs">
          <MacroCell label="Protéines" value={formatMacro('protein', preview.protein)} />
          <MacroCell
            label="Glucides"
            value={formatMacro('carbs', preview.carbs)}
            sub={`dont sucres ${formatMacro('sugars', preview.sugars)} g`}
          />
          <MacroCell label="Lipides" value={formatMacro('fat', preview.fat)} />
          <MacroCell label="Fibres" value={formatMacro('fiber', preview.fiber)} />
        </dl>
      </div>

      <Button type="submit" className="mt-4 w-full" disabled={!valid || busy}>
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

function MacroCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value} g</dd>
      {sub && <dd className="text-[11px] text-muted">{sub}</dd>}
    </div>
  );
}

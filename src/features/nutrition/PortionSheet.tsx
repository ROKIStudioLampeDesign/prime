import { useState, type FormEvent } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { StarIcon } from '../../components/icons';
import { iconButton } from '../../components/Screen';
import { servingGrams, type Serving } from '../../domain/meal';
import { parseDecimal } from '../../domain/number';
import { computeMacros, MEAL_SLOTS, roundTo, type MealSlot, type Per100g } from '../../domain/nutrition';
import { formatGrams, formatMacro, toInputValue } from '../../lib/format';
import { SLOT_SHORT_LABELS } from './labels';

export interface PortionTarget {
  name: string;
  /** Header subtitle; defaults to "brand · kcal / 100 g". */
  subtitle?: string;
  brand?: string;
  per100g: Per100g;
  /** Weight of one portion. When set (meals), the quantity can be entered in portions. */
  portionGrams?: number;
  /** Shown above the form, e.g. when a meal has deleted ingredients. */
  warning?: string;
  /** When set, the quantity can't be submitted and this explains why. */
  disabledReason?: string;
}

export interface PortionValue {
  grams: number;
  /** Set when the quantity was entered in portions. */
  portions?: number;
  /** Undefined when the sheet has no meal selector. */
  slot?: MealSlot;
}

interface PortionSheetProps {
  /** The sheet is open while a target is given. */
  target: PortionTarget | undefined;
  /** Identity of what is being edited; the form resets when it changes. */
  formKey: string;
  initial: Serving;
  /** Omit to hide the meal selector (e.g. for recipe ingredients). */
  initialSlot?: MealSlot;
  submitLabel: string;
  onSubmit: (value: PortionValue) => Promise<void>;
  onDelete?: () => Promise<void>;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onClose: () => void;
}

const MAX_GRAMS = 10000;
const MAX_PORTIONS = 50;
const QUICK_GRAMS = [10, 50, 100];
const QUICK_PORTIONS = [0.5, 1, 1.5, 2];

export function PortionSheet(props: PortionSheetProps) {
  const { target, favorite, onToggleFavorite, onClose } = props;
  return (
    <BottomSheet
      open={target !== undefined}
      onClose={onClose}
      title={target?.name ?? ''}
      header={
        target && (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-lg leading-snug font-semibold">{target.name}</h2>
              <p className="text-sm text-muted">
                {target.subtitle ??
                  `${target.brand ? `${target.brand} · ` : ''}${formatMacro('kcal', target.per100g.kcal)} kcal / 100 g`}
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
      {target && <PortionForm key={props.formKey} {...props} target={target} />}
    </BottomSheet>
  );
}

type Mode = 'portions' | 'grams';

function PortionForm({
  target,
  initial,
  initialSlot,
  submitLabel,
  onSubmit,
  onDelete,
}: PortionSheetProps & { target: PortionTarget }) {
  const portionGrams = target.portionGrams && target.portionGrams > 0 ? target.portionGrams : undefined;
  const [mode, setMode] = useState<Mode>(portionGrams && 'portions' in initial ? 'portions' : 'grams');
  const [text, setText] = useState(() =>
    toInputValue(
      'portions' in initial
        ? portionGrams
          ? initial.portions
          : servingGrams(initial, target.portionGrams ?? 0)
        : initial.grams,
    ),
  );
  const [slot, setSlot] = useState(initialSlot);
  const [busy, setBusy] = useState(false);

  const parsed = parseDecimal(text);
  const amount = parsed !== undefined && Number.isFinite(parsed) ? parsed : 0;
  const grams =
    mode === 'portions' && portionGrams ? servingGrams({ portions: amount }, portionGrams) : amount;
  const valid =
    !target.disabledReason &&
    amount > 0 &&
    grams > 0 &&
    grams <= MAX_GRAMS &&
    (mode === 'grams' || amount <= MAX_PORTIONS);
  const preview = computeMacros(target.per100g, grams);

  function switchMode(next: Mode) {
    if (next === mode || !portionGrams) return;
    // Keep the same quantity when switching units.
    if (amount > 0)
      setText(toInputValue(next === 'grams' ? roundTo(grams, 0) : roundTo(amount / portionGrams, 2)));
    setMode(next);
  }

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
    if (!valid) return;
    void run(() => onSubmit({ grams, ...(mode === 'portions' && { portions: amount }), slot }));
  }

  return (
    <form onSubmit={handleSubmit}>
      {target.warning && (
        <p role="status" className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {target.warning}
        </p>
      )}
      {slot !== undefined && (
        <SegmentedControl
          label="Repas"
          options={MEAL_SLOTS.map((s) => ({ value: s, label: SLOT_SHORT_LABELS[s] }))}
          value={slot}
          onChange={setSlot}
          tone="accent"
          dense
          onSurface
        />
      )}

      {portionGrams && (
        <div className="mt-3">
          <SegmentedControl
            label="Unité"
            options={[
              { value: 'portions', label: 'Portions' },
              { value: 'grams', label: 'Grammes' },
            ]}
            value={mode}
            onChange={switchMode}
            tone="accent"
            onSurface
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2">
        <input
          aria-label={mode === 'portions' ? 'Nombre de portions' : 'Quantité en grammes'}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          aria-invalid={text !== '' && !valid}
          className={`w-36 rounded-xl border bg-bg py-2 text-center text-5xl numeral outline-none focus:border-accent ${
            text !== '' && !valid ? 'border-danger' : 'border-line'
          }`}
        />
        <span className="w-20 text-xl font-semibold text-muted">
          {mode === 'portions' ? (amount >= 2 ? 'portions' : 'portion') : 'g'}
        </span>
      </div>
      {mode === 'portions' && portionGrams && (
        <p className="mt-1 text-center text-xs text-muted tabular-nums">
          = {formatGrams(roundTo(grams, 0))} g · 1 portion = {formatGrams(roundTo(portionGrams, 0))} g
        </p>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2">
        {mode === 'portions'
          ? QUICK_PORTIONS.map((p) => (
              <Button
                key={p}
                variant={amount === p ? 'primary' : 'secondary'}
                className="min-h-11 text-sm"
                onClick={() => setText(toInputValue(p))}
              >
                {toInputValue(p)}
              </Button>
            ))
          : QUICK_GRAMS.map((step) => (
              <Button
                key={step}
                variant="secondary"
                className="min-h-11 text-sm"
                onClick={() => setText(toInputValue(Math.min(MAX_GRAMS, amount + step)))}
              >
                +{step} g
              </Button>
            ))}
        {mode === 'grams' && (
          <Button variant="secondary" className="min-h-11 text-sm" onClick={() => setText('')}>
            Effacer
          </Button>
        )}
      </div>

      <MacroPreview macros={preview} />

      {target.disabledReason && (
        <p className="mt-3 text-center text-sm text-danger">{target.disabledReason}</p>
      )}
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

export function MacroPreview({ macros }: { macros: ReturnType<typeof computeMacros> }) {
  return (
    <div className="mt-4 rounded-xl bg-bg p-3" aria-live="polite">
      <p className="text-center">
        <span className="text-3xl leading-none numeral">{formatMacro('kcal', macros.kcal)}</span>
        <span className="text-sm text-muted"> kcal</span>
      </p>
      <dl className="mt-2 grid grid-cols-4 text-center text-xs">
        <MacroCell label="Protéines" value={formatMacro('protein', macros.protein)} />
        <MacroCell
          label="Glucides"
          value={formatMacro('carbs', macros.carbs)}
          sub={`sucres ${formatMacro('sugars', macros.sugars)} g`}
        />
        <MacroCell label="Lipides" value={formatMacro('fat', macros.fat)} />
        <MacroCell label="Fibres" value={formatMacro('fiber', macros.fiber)} />
      </dl>
    </div>
  );
}

function MacroCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value} g</dd>
      {sub && <dd className="text-[11px] whitespace-nowrap text-muted">{sub}</dd>}
    </div>
  );
}

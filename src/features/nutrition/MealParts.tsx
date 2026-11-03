import { BlobImage } from '../../components/BlobImage';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../../components/icons';
import { iconButton } from '../../components/Screen';
import type { Food } from '../../db/db';
import type { MealSummary } from '../../domain/meal';
import { computeMacros, roundTo, type Macros } from '../../domain/nutrition';
import { formatGrams, formatMacro } from '../../lib/format';
import { missingIngredientsWarning, portionsLabel } from './pickerItems';
import { MacroPreview } from './PortionSheet';

interface IngredientItemProps {
  gramsText: string;
  /** Undefined when the product was deleted. */
  food: Food | undefined;
  grams: number;
  invalid: boolean;
  isFirst: boolean;
  isLast: boolean;
  onGramsChange: (text: string) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

export function IngredientItem({
  gramsText,
  food,
  grams,
  invalid,
  isFirst,
  isLast,
  onGramsChange,
  onMove,
  onRemove,
}: IngredientItemProps) {
  const label = food?.name ?? 'Produit supprimé';
  const kcal = food && Number.isFinite(grams) ? computeMacros(food.per100g, grams).kcal : undefined;
  return (
    <li className="rounded-2xl bg-surface p-3">
      <div className="flex items-center gap-3">
        <BlobImage blob={food?.photo} alt="" className="size-10 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className={`truncate ${food ? '' : 'text-danger italic'}`}>{label}</p>
          <p className="text-xs text-muted tabular-nums">
            {food
              ? kcal !== undefined
                ? `${formatMacro('kcal', kcal)} kcal`
                : '—'
              : 'Non compté dans les totaux'}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <div
          className={`flex h-11 w-28 items-center rounded-xl border bg-bg px-3 focus-within:border-accent ${
            invalid ? 'border-danger' : 'border-line'
          }`}
        >
          <input
            aria-label={`Quantité de ${label} en grammes`}
            aria-invalid={invalid || undefined}
            inputMode="decimal"
            autoComplete="off"
            value={gramsText}
            onChange={(e) => onGramsChange(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full min-w-0 bg-transparent text-base tabular-nums outline-none"
          />
          <span className="text-sm text-muted">g</span>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          aria-label={`Monter ${label}`}
          disabled={isFirst}
          className={`${iconButton} disabled:opacity-30`}
          onClick={() => onMove(-1)}
        >
          <ArrowUpIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label={`Descendre ${label}`}
          disabled={isLast}
          className={`${iconButton} disabled:opacity-30`}
          onClick={() => onMove(1)}
        >
          <ArrowDownIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label={`Retirer ${label}`}
          className={`${iconButton} -mr-2 hover:text-danger`}
          onClick={onRemove}
        >
          <TrashIcon className="size-5" />
        </button>
      </div>
    </li>
  );
}

function MacroLine({ label, macros }: { label: string; macros: Macros }) {
  // Stacked: a side-by-side label and values wrap badly at 390 px.
  return (
    <div className="py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm tabular-nums">
        <span className="font-semibold">{formatMacro('kcal', macros.kcal)} kcal</span>
        <span className="text-muted">
          {' '}
          · P {formatMacro('protein', macros.protein)} g · G {formatMacro('carbs', macros.carbs)} g · L{' '}
          {formatMacro('fat', macros.fat)} g
        </span>
      </p>
    </div>
  );
}

export function MealTotals({ summary }: { summary: MealSummary }) {
  return (
    <section aria-labelledby="totals-title" className="rounded-2xl bg-surface p-4">
      <h2 id="totals-title" className="font-semibold">
        Total du plat
      </h2>
      {summary.missingCount > 0 && (
        <p role="status" className="mt-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {missingIngredientsWarning(summary.missingCount)}
        </p>
      )}
      <MacroPreview macros={summary.total} />
      <div className="mt-2 divide-y divide-line">
        <MacroLine
          label={`Par portion (${portionsLabel(summary.portionCount)})`}
          macros={summary.perPortion}
        />
        {summary.per100g && (
          <MacroLine
            label={`Pour 100 g (${summary.usesCookedWeight ? 'cuit' : 'cru'}, ${formatGrams(roundTo(summary.dishWeight, 0))} g)`}
            macros={summary.per100g}
          />
        )}
      </div>
    </section>
  );
}

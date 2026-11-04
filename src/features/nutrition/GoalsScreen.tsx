import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { useGoBack } from '../../components/useGoBack';
import { getGoals, saveGoals } from '../../db/goals';
import { parseDecimal } from '../../domain/number';
import {
  estimateKcal,
  GOAL_KINDS,
  MACRO_KEYS,
  validateGoals,
  type Goals,
  type GoalsInput,
  type MacroKey,
} from '../../domain/nutrition';
import { formatMacro, toInputValue } from '../../lib/format';
import { MACRO_LABELS, MACRO_UNITS } from './labels';

const HINTS: Record<(typeof GOAL_KINDS)[MacroKey], string> = {
  ceiling: 'Rester juste en dessous',
  target: 'Cible',
  min: 'Minimum',
  max: 'Maximum',
};

/** Réglages › Objectifs */
export function GoalsScreen() {
  const goals = useLiveQuery(getGoals);
  return (
    <Screen title="Objectifs" back backFallback="/settings">
      {goals === undefined ? <Loading /> : <GoalsForm goals={goals} />}
    </Screen>
  );
}

function GoalsForm({ goals }: { goals: Goals }) {
  const goBack = useGoBack('/settings');
  const [texts, setTexts] = useState(
    () => Object.fromEntries(MACRO_KEYS.map((k) => [k, toInputValue(goals[k])])) as Record<MacroKey, string>,
  );
  const [saving, setSaving] = useState(false);

  const parsed: GoalsInput = {};
  for (const key of MACRO_KEYS) {
    const v = parseDecimal(texts[key]);
    if (v !== undefined) parsed[key] = v;
  }
  const { errors, value } = validateGoals(parsed);
  const macroKcal =
    value?.protein !== undefined && value.carbs !== undefined && value.fat !== undefined
      ? estimateKcal({ protein: value.protein, carbs: value.carbs, fat: value.fat })
      : undefined;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value || saving) return;
    setSaving(true);
    try {
      await saveGoals(value);
      goBack();
    } finally {
      setSaving(false);
    }
  }

  const field = (macro: MacroKey, tone: GoalTone, className = '', note?: string) => (
    <GoalField
      macro={macro}
      tone={tone}
      className={className}
      text={texts[macro]}
      onChange={(text) => setTexts((t) => ({ ...t, [macro]: text }))}
      invalid={errors[macro] !== undefined}
      note={note}
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-sm font-semibold text-muted">
        Objectifs quotidiens. Laisse un champ vide pour ne pas suivre ce nutriment.
      </p>
      {/* Full-width cells: energy is the yellow band, protein the paper cell, the rest plain. */}
      <div className="mt-4 edge grid grid-cols-2 gap-0.5">
        {field(
          'kcal',
          'nutrition',
          'col-span-2',
          macroKcal === undefined ? undefined : `Tes macros donnent ≈ ${formatMacro('kcal', macroKcal)} kcal`,
        )}
        {field('protein', 'paper')}
        {field('carbs', 'plain')}
        {field('fat', 'plain')}
        {field('sugars', 'plain')}
        {field('fiber', 'plain', 'col-span-2')}
      </div>
      <Button type="submit" disabled={!value || saving} className="mt-4 w-full">
        Enregistrer
      </Button>
    </form>
  );
}

type GoalTone = 'nutrition' | 'paper' | 'plain';

const TONES: Record<GoalTone, { cell: string; secondary: string; danger: string }> = {
  nutrition: { cell: 'bg-nutrition text-ink', secondary: 'text-ink/72', danger: 'text-danger-ink' },
  paper: { cell: 'bg-paper text-ink', secondary: 'text-ink/72', danger: 'text-danger-ink' },
  plain: { cell: 'bg-surface text-fg', secondary: 'text-muted', danger: 'text-danger' },
};

interface GoalFieldProps {
  macro: MacroKey;
  tone: GoalTone;
  className: string;
  text: string;
  onChange: (text: string) => void;
  invalid: boolean;
  note?: string;
}

/** One goal as a cell with a big input; focus draws a bar along the cell's bottom edge. */
function GoalField({ macro, tone, className, text, onChange, invalid, note }: GoalFieldProps) {
  const id = useId();
  const { cell, secondary, danger } = TONES[tone];
  const kindId = `${id}-kind`;
  const descId = invalid || note ? `${id}-desc` : undefined;
  return (
    <div className={`${cell} py-3 px-safe focus-within:shadow-[inset_0_-4px_0_currentColor] ${className}`}>
      <div className="flex justify-between gap-2 text-xs font-extrabold">
        <label htmlFor={id}>{MACRO_LABELS[macro]}</label>
        <span id={kindId} className={secondary}>
          {HINTS[GOAL_KINDS[macro]]}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <input
          id={id}
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          placeholder="—"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={descId ? `${kindId} ${descId}` : kindId}
          className={`w-full min-w-0 flex-1 bg-transparent numeral outline-none placeholder:text-current/40 ${
            macro === 'kcal' ? 'text-[4.5rem] leading-[0.95]' : 'text-[2.5rem] leading-tight'
          }`}
        />
        <span className="shrink-0 text-sm font-extrabold">{MACRO_UNITS[macro]}</span>
      </div>
      {descId && (
        <p id={descId} className={`mt-1 text-xs font-bold ${invalid ? danger : secondary}`}>
          {invalid ? 'Nombre positif attendu' : note}
        </p>
      )}
    </div>
  );
}

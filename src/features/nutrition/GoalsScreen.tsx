import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Objectifs quotidiens. Laisse un champ vide pour ne pas suivre ce nutriment.
      </p>
      {MACRO_KEYS.map((key) => (
        <TextField
          key={key}
          label={MACRO_LABELS[key]}
          suffix={MACRO_UNITS[key]}
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          value={texts[key]}
          onChange={(e) => setTexts((t) => ({ ...t, [key]: e.target.value }))}
          error={errors[key] && 'Nombre positif attendu'}
          hint={
            key === 'kcal' && macroKcal !== undefined
              ? `${HINTS[GOAL_KINDS[key]]} · tes macros donnent ≈ ${formatMacro('kcal', macroKcal)} kcal`
              : HINTS[GOAL_KINDS[key]]
          }
        />
      ))}
      <Button type="submit" disabled={!value || saving} className="mt-2">
        Enregistrer
      </Button>
    </form>
  );
}

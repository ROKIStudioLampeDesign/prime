import { Link } from 'react-router';
import { ProgressBar, ProgressRing, type ProgressTone } from '../../components/Progress';
import {
  GOAL_KINDS,
  goalProgress,
  MACRO_KEYS,
  type GoalProgress,
  type Goals,
  type MacroKey,
  type Macros,
} from '../../domain/nutrition';
import { formatMacro } from '../../lib/format';
import { MACRO_LABELS, MACRO_UNITS } from './labels';

interface DailySummaryProps {
  totals: Macros;
  goals: Goals;
}

function progressFor(key: MacroKey, totals: Macros, goals: Goals): GoalProgress | undefined {
  const goal = goals[key];
  return goal === undefined ? undefined : goalProgress(totals[key], goal, GOAL_KINDS[key]);
}

function toneFor(progress: GoalProgress | undefined): ProgressTone {
  if (!progress) return 'muted';
  return progress.bad ? 'danger' : 'accent';
}

function ringCaption(macro: MacroKey, progress: GoalProgress | undefined): string {
  const unit = MACRO_UNITS[macro];
  if (!progress) return 'Pas d’objectif';
  if (progress.remaining > 0) return `Reste ${formatMacro(macro, progress.remaining)} ${unit}`;
  if (progress.bad) return `${formatMacro(macro, -progress.remaining)} ${unit} en trop`;
  return 'Objectif atteint';
}

function RingStat({ macro, totals, goals }: { macro: 'kcal' | 'protein'; totals: Macros; goals: Goals }) {
  const progress = progressFor(macro, totals, goals);
  const goal = goals[macro];
  const unit = MACRO_UNITS[macro];
  const caption = ringCaption(macro, progress);

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <ProgressRing ratio={progress?.ratio ?? 0} tone={toneFor(progress)} size={120}>
        <span className="text-2xl leading-tight font-bold tabular-nums">
          {formatMacro(macro, totals[macro])}
        </span>
        <span className="text-xs text-muted tabular-nums">
          {goal === undefined ? unit : `/ ${formatMacro(macro, goal)} ${unit}`}
        </span>
      </ProgressRing>
      <div className="text-center">
        <p className="text-sm font-semibold">{MACRO_LABELS[macro]}</p>
        <p className={`text-xs ${progress?.bad ? 'text-danger' : 'text-muted'}`}>{caption}</p>
      </div>
    </div>
  );
}

function BarStat({ macro, totals, goals }: { macro: MacroKey; totals: Macros; goals: Goals }) {
  const progress = progressFor(macro, totals, goals);
  const goal = goals[macro];
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted">
          {MACRO_LABELS[macro]}
          {GOAL_KINDS[macro] === 'max' && goal !== undefined && ' (max)'}
        </span>
        <span className={`tabular-nums ${progress?.bad ? 'text-danger' : ''}`}>
          {formatMacro(macro, totals[macro])}
          {goal !== undefined && <span className="text-muted"> / {formatMacro(macro, goal)}</span>} g
        </span>
      </div>
      <ProgressBar ratio={progress?.ratio ?? 0} tone={toneFor(progress)} />
    </div>
  );
}

export function DailySummary({ totals, goals }: DailySummaryProps) {
  const hasGoals = MACRO_KEYS.some((key) => goals[key] !== undefined);
  return (
    <section aria-label="Totaux du jour" className="rounded-2xl bg-surface p-4">
      <div className="flex gap-2">
        <RingStat macro="kcal" totals={totals} goals={goals} />
        <RingStat macro="protein" totals={totals} goals={goals} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
        {(['carbs', 'sugars', 'fat', 'fiber'] as const).map((macro) => (
          <BarStat key={macro} macro={macro} totals={totals} goals={goals} />
        ))}
      </div>
      {!hasGoals && (
        <Link
          to="/settings/goals"
          className="mt-4 flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-accent active:bg-surface-2"
        >
          Définir mes objectifs
        </Link>
      )}
    </section>
  );
}

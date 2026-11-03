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

/** The summary is an Alimentation tile: ink on peach, warnings in danger-ink. */
function toneFor(progress: GoalProgress | undefined): ProgressTone {
  return progress?.bad ? 'danger-ink' : 'ink';
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
        <span className="text-3xl leading-none numeral">{formatMacro(macro, totals[macro])}</span>
        <span className="text-xs font-semibold text-ink/75 tabular-nums">
          {goal === undefined ? unit : `/ ${formatMacro(macro, goal)} ${unit}`}
        </span>
      </ProgressRing>
      <div className="text-center">
        <p className="text-sm font-bold">{MACRO_LABELS[macro]}</p>
        <p className={`text-xs font-semibold ${progress?.bad ? 'text-danger-ink' : 'text-ink/75'}`}>
          {caption}
        </p>
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
        <span className="font-semibold text-ink/75">
          {MACRO_LABELS[macro]}
          {GOAL_KINDS[macro] === 'max' && goal !== undefined && ' (max)'}
        </span>
        <span className={`font-bold tabular-nums ${progress?.bad ? 'text-danger-ink' : ''}`}>
          {formatMacro(macro, totals[macro])}
          {goal !== undefined && (
            <span className="font-semibold text-ink/75"> / {formatMacro(macro, goal)}</span>
          )}{' '}
          g
        </span>
      </div>
      <ProgressBar ratio={progress?.ratio ?? 0} tone={toneFor(progress)} />
    </div>
  );
}

export function DailySummary({ totals, goals }: DailySummaryProps) {
  const hasGoals = MACRO_KEYS.some((key) => goals[key] !== undefined);
  return (
    <section aria-label="Totaux du jour" className="rounded-3xl bg-peach p-5 text-ink">
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
          className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-on-ink active:opacity-80"
        >
          Définir mes objectifs
        </Link>
      )}
    </section>
  );
}

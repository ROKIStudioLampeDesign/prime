import { Link } from 'react-router';
import { BigNumber } from '../../components/BigNumber';
import { ProgressBar, type ProgressTone } from '../../components/Progress';
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

/** The summary is an Alimentation band: ink on yellow, warnings in danger-ink. */
function toneFor(progress: GoalProgress | undefined): ProgressTone {
  return progress?.bad ? 'danger-ink' : 'ink';
}

function kcalCaption(progress: GoalProgress | undefined): string {
  if (!progress) return 'Pas d’objectif de calories';
  if (progress.remaining > 0) return `Reste ${formatMacro('kcal', progress.remaining)} kcal`;
  if (progress.bad) return `${formatMacro('kcal', -progress.remaining)} kcal en trop`;
  return 'Objectif atteint';
}

function MacroStat({ macro, totals, goals }: { macro: MacroKey; totals: Macros; goals: Goals }) {
  const progress = progressFor(macro, totals, goals);
  const goal = goals[macro];
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-extrabold">
        {MACRO_LABELS[macro]}
        {GOAL_KINDS[macro] === 'max' && goal !== undefined && ' (max)'}
      </p>
      <p
        className={`mt-0.5 text-[1.375rem] leading-tight headline tabular-nums ${progress?.bad ? 'text-danger-ink' : ''}`}
      >
        {formatMacro(macro, totals[macro])}
        <span className="text-xs font-bold text-ink/72">
          {goal === undefined ? ` ${MACRO_UNITS[macro]}` : ` / ${formatMacro(macro, goal)}`}
        </span>
      </p>
      <div className="mt-1">
        <ProgressBar ratio={progress?.ratio ?? 0} tone={toneFor(progress)} />
      </div>
    </div>
  );
}

export function DailySummary({ totals, goals }: DailySummaryProps) {
  const hasGoals = MACRO_KEYS.some((key) => goals[key] !== undefined);
  const kcal = progressFor('kcal', totals, goals);
  return (
    <section aria-label="Totaux du jour" className="@container bleed bg-nutrition py-4 text-ink">
      <div className="flex justify-between text-sm font-extrabold">
        <span>Calories</span>
        <span className="font-bold tabular-nums">
          {goals.kcal === undefined ? 'kcal' : `sur ${formatMacro('kcal', goals.kcal)} kcal`}
        </span>
      </div>
      <BigNumber value={formatMacro('kcal', totals.kcal)} maxRem={7.5} className="mt-1.5 leading-[0.82]" />
      <p className={`mt-2 text-[15px] font-bold tabular-nums ${kcal?.bad ? 'text-danger-ink' : ''}`}>
        {kcalCaption(kcal)}
      </p>
      {kcal && (
        <div className="mt-2 [&>div]:h-3">
          <ProgressBar ratio={kcal.ratio} tone={toneFor(kcal)} />
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3">
        {(['protein', 'carbs', 'fat', 'sugars', 'fiber'] as const).map((macro) => (
          <MacroStat key={macro} macro={macro} totals={totals} goals={goals} />
        ))}
      </div>
      {!hasGoals && (
        <Link
          to="/settings/goals"
          className="mt-4 flex min-h-12 items-center justify-center bg-ink text-sm font-black text-on-ink focus-inset active:opacity-80"
        >
          Définir mes objectifs
        </Link>
      )}
    </section>
  );
}

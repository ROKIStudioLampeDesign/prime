import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { ForwardIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { getGoals } from '../../db/goals';
import { getRestSeconds, REST_OPTIONS, setRestSeconds } from '../../db/gymDays';
import type { Goals } from '../../domain/nutrition';
import { formatClock, formatMacro } from '../../lib/format';
import { DataSection } from './DataSection';

function goalsSummary(goals: Goals): string {
  const parts = [];
  if (goals.kcal !== undefined) parts.push(`${formatMacro('kcal', goals.kcal)} kcal`);
  if (goals.protein !== undefined) parts.push(`${formatMacro('protein', goals.protein)} g prot.`);
  return parts.length > 0 ? parts.join(' · ') : 'Non définis';
}

/** Rest timer started after each validated set during a workout. */
function RestTimerSetting() {
  const seconds = useLiveQuery(getRestSeconds);
  return (
    <section className="mt-4 rounded-2xl bg-surface p-4" aria-labelledby="rest-timer">
      <h2 id="rest-timer">Minuteur de repos</h2>
      <p className="text-xs text-muted">Démarre automatiquement quand tu valides une série.</p>
      <div
        className="mt-3 grid grid-cols-5 gap-1 rounded-xl bg-surface-2 p-1"
        role="radiogroup"
        aria-labelledby="rest-timer"
      >
        {REST_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={seconds === option}
            onClick={() => void setRestSeconds(option)}
            className={`min-h-11 rounded-lg text-sm font-semibold tabular-nums ${
              seconds === option ? 'bg-accent-fill text-accent-fg' : 'text-muted'
            }`}
          >
            {option === 0 ? 'Non' : formatClock(option)}
          </button>
        ))}
      </div>
    </section>
  );
}

export function SettingsScreen() {
  const goals = useLiveQuery(getGoals);

  return (
    <Screen title="Réglages" back>
      {goals === undefined ? (
        <Loading />
      ) : (
        <>
          <section className="mt-2 overflow-hidden rounded-2xl bg-surface">
            <Link
              to="/settings/goals"
              className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-surface-2"
            >
              <span className="flex-1">Objectifs</span>
              <span className="text-sm text-muted">{goalsSummary(goals)}</span>
              <ForwardIcon className="size-5 text-muted" />
            </Link>
          </section>

          <RestTimerSetting />

          <DataSection />
        </>
      )}

      {import.meta.env.DEV && <DevTools />}
    </Screen>
  );
}

/** Development helpers; `import.meta.env.DEV` is false in production builds, so this is stripped. */
function DevTools() {
  const [status, setStatus] = useState<string>();
  return (
    <section className="mt-8 rounded-2xl border border-dashed border-line p-4">
      <h2 className="text-sm font-semibold text-muted">Développement</h2>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={async () => {
          setStatus('Chargement…');
          const { loadDemoData, loadGymDemoData, loadBodyWeightDemoData } = await import('../../db/demo');
          await loadDemoData();
          await loadGymDemoData();
          await loadBodyWeightDemoData();
          setStatus('Données de démo chargées (alimentation, salle et poids remplacés).');
        }}
      >
        Charger des données de démo
      </Button>
      {status && <p className="mt-2 text-xs text-muted">{status}</p>}
    </section>
  );
}

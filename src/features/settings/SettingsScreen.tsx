import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { ForwardIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { SegmentedControl } from '../../components/SegmentedControl';
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
    <section className="mt-6 bleed bg-gym py-4 text-on-gym" aria-labelledby="rest-timer">
      <h2 id="rest-timer" className="text-[1.375rem] leading-tight headline">
        Minuteur de repos
      </h2>
      <p className="mt-0.5 text-sm font-semibold">Démarre automatiquement quand tu valides une série.</p>
      {seconds === undefined ? (
        <div className="mt-3 h-13" />
      ) : (
        <div className="mt-3">
          <SegmentedControl
            label="Minuteur de repos"
            options={REST_OPTIONS.map((option) => ({
              value: String(option),
              label: option === 0 ? 'Non' : formatClock(option),
            }))}
            value={String(seconds)}
            onChange={(v) => void setRestSeconds(Number(v))}
            tone="gym"
          />
        </div>
      )}
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
          <section className="mt-2 border-b border-line">
            <Link to="/settings/goals" className="flex min-h-16 items-center gap-3 py-3 active:opacity-60">
              <span className="flex-1 text-xl headline">Objectifs</span>
              <span className="text-sm font-bold text-muted">{goalsSummary(goals)}</span>
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
    <section className="mt-8 border-2 border-dashed border-line p-4">
      <h2 className="text-sm font-extrabold text-muted">Développement</h2>
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

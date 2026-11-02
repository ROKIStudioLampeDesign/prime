import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { SegmentedControl } from '../../components/SegmentedControl';
import {
  getBodyMapSettings,
  listCompletedSetDates,
  saveBodyMapSettings,
  type BodyMapSettings,
} from '../../db/bodyMap';
import type { Exercise } from '../../db/db';
import { listExercises } from '../../db/exercises';
import { todayLocalDate } from '../../domain/date';
import { colorFor, muscleRecency, type TrainingRecord } from '../../domain/muscleRecency';
import { MUSCLE_IDS, MUSCLES, type BodyView, type MuscleId } from '../../domain/muscles';
import { BodyMap } from './BodyMap';
import { BodyMapSettingsPanel } from './BodyMapSettingsPanel';
import { shortAgo } from './labels';
import { MuscleSheet } from './MuscleSheet';
import { RecencyLegend } from './RecencyLegend';

type Mode = 'map' | 'list';

/** Horizontal distance (px) a swipe must cover to flip the body. */
const SWIPE_PX = 50;

export function BodyScreen() {
  const settings = useLiveQuery(getBodyMapSettings);
  const sets = useLiveQuery(listCompletedSetDates);
  const exercises = useLiveQuery(listExercises);

  return (
    <Screen title="Corps">
      {settings === undefined || sets === undefined || exercises === undefined ? (
        <Loading />
      ) : (
        <BodyContent initialSettings={settings} sets={sets} exercises={exercises} />
      )}
    </Screen>
  );
}

interface BodyContentProps {
  initialSettings: BodyMapSettings;
  sets: { date: TrainingRecord['date']; exerciseId: number }[];
  exercises: Exercise[];
}

function BodyContent({ initialSettings, sets, exercises }: BodyContentProps) {
  // Local copy so sliders stay smooth; every change is persisted right away.
  const [settings, setSettings] = useState(initialSettings);
  const [mode, setMode] = useState<Mode>('map');
  const [view, setView] = useState<BodyView>('front');
  const [selected, setSelected] = useState<MuscleId>();
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const today = todayLocalDate();

  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const records = useMemo<TrainingRecord[]>(
    () =>
      sets.flatMap((s) => {
        const ex = exercisesById.get(s.exerciseId);
        return ex ? [{ ...s, primary: ex.primaryMuscles, secondary: ex.secondaryMuscles }] : [];
      }),
    [sets, exercisesById],
  );
  const options = { countSecondary: settings.countSecondary };
  const recency = muscleRecency(records, today, options);
  const colors = Object.fromEntries(
    MUSCLE_IDS.map((m) => [m, colorFor(recency[m].days, settings)]),
  ) as Record<MuscleId, string>;

  function updateSettings(next: BodyMapSettings) {
    setSettings(next);
    void saveBodyMapSettings(next);
  }

  function onPointerDown(e: PointerEvent) {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      setView((v) => (v === 'front' ? 'back' : 'front'));
    }
  }

  return (
    <>
      <SegmentedControl
        label="Affichage"
        options={[
          { value: 'map', label: 'Carte' },
          { value: 'list', label: 'Liste' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {records.length === 0 && (
        <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm text-muted">
          Aucune série validée pour l’instant : les muscles se coloreront après ta première séance.{' '}
          <Link to="/gym" className="font-semibold text-accent">
            Aller à la salle
          </Link>
        </p>
      )}

      {mode === 'map' ? (
        <>
          <div className="mt-3">
            <SegmentedControl
              label="Vue"
              options={[
                { value: 'front', label: 'Face' },
                { value: 'back', label: 'Dos' },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
          <div
            className="mt-3 touch-pan-y rounded-2xl bg-surface py-3 select-none"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipeStart.current = null)}
          >
            <BodyMap
              key={view}
              view={view}
              colors={colors}
              selected={selected}
              onSelect={setSelected}
              className="mx-auto block aspect-[1/2] w-[min(62vw,240px)] motion-safe:animate-fade-in"
            />
            <p className="mt-1 text-center text-xs text-muted">
              Touche un muscle pour le détail · glisse pour voir {view === 'front' ? 'le dos' : 'la face'}
            </p>
          </div>
          <div className="mt-3">
            <RecencyLegend thresholds={settings} />
          </div>
        </>
      ) : (
        <MuscleList recency={recency} colors={colors} onSelect={setSelected} />
      )}

      <div className="mt-3">
        <BodyMapSettingsPanel settings={settings} onChange={updateSettings} />
      </div>

      <MuscleSheet
        muscle={selected}
        recency={selected && recency[selected]}
        color={selected && colors[selected]}
        records={records}
        exercises={exercisesById}
        options={options}
        today={today}
        onClose={() => setSelected(undefined)}
      />
    </>
  );
}

const collator = new Intl.Collator('fr');

/** Every muscle, most neglected first (never trained, then most days). Also the text fallback of the map. */
function MuscleList({
  recency,
  colors,
  onSelect,
}: {
  recency: ReturnType<typeof muscleRecency>;
  colors: Record<MuscleId, string>;
  onSelect: (m: MuscleId) => void;
}) {
  const sorted = [...MUSCLE_IDS].sort((a, b) => {
    const da = recency[a].days ?? Infinity;
    const db = recency[b].days ?? Infinity;
    return da === db ? collator.compare(MUSCLES[a].label, MUSCLES[b].label) : db - da;
  });
  return (
    <ul
      className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-surface"
      aria-label="Muscles par ancienneté"
    >
      {sorted.map((m) => (
        <li key={m}>
          <button
            type="button"
            onClick={() => onSelect(m)}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left active:bg-surface-2"
          >
            <span
              className="size-3.5 shrink-0 rounded-full transition-colors duration-500"
              style={{ backgroundColor: colors[m] }}
              aria-hidden="true"
            />
            <span className="flex-1">{MUSCLES[m].label}</span>
            <span className="text-sm text-muted tabular-nums">
              {recency[m].days === undefined ? 'Jamais' : shortAgo(recency[m].days)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

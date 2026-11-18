import { useLiveQuery } from 'dexie-react-hooks';
import { useToday } from '../../components/useToday';
import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { SegmentedControl } from '../../components/SegmentedControl';
import { getBodyMapSettings, listCompletedSetDates, type BodyMapSettings } from '../../db/bodyMap';
import type { Exercise } from '../../db/db';
import { listExercises } from '../../db/exercises';
import { colorForIntensity, muscleRecency, type TrainingRecord } from '../../domain/muscleRecency';
import { MUSCLE_IDS, type BodyView, type MuscleId } from '../../domain/muscles';
import { BodyMap } from './BodyMap';
import { MuscleSheet } from './MuscleSheet';
import { RecencyLegend } from './RecencyLegend';

/** Horizontal distance (px) a swipe must cover to flip the body. */
const SWIPE_PX = 50;
/** How long a touch's rings stay mounted: their animation (`ring-burst`) is over by then. */
const BURST_MS = 1000;

export function BodyScreen() {
  const settings = useLiveQuery(getBodyMapSettings);
  const sets = useLiveQuery(listCompletedSetDates);
  const exercises = useLiveQuery(listExercises);

  return (
    <Screen title="Corps" fit>
      {settings === undefined || sets === undefined || exercises === undefined ? (
        <Loading />
      ) : (
        <BodyContent settings={settings} sets={sets} exercises={exercises} />
      )}
    </Screen>
  );
}

interface BodyContentProps {
  /** Set in Réglages (gear icon); read live, so a change there applies right away. */
  settings: BodyMapSettings;
  sets: { date: TrainingRecord['date']; exerciseId: number }[];
  exercises: Exercise[];
}

function BodyContent({ settings, sets, exercises }: BodyContentProps) {
  const [view, setView] = useState<BodyView>('front');
  const [selected, setSelected] = useState<MuscleId>();
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  // Rings bursting from each touch, positioned inside the map's box.
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastBurst = useRef(0);
  const today = useToday();

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
  const recency = muscleRecency(records, today, options, settings);
  const colors = Object.fromEntries(
    MUSCLE_IDS.map((m) => [m, colorForIntensity(recency[m].intensity)]),
  ) as Record<MuscleId, string>;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    swipeStart.current = { x: e.clientX, y: e.clientY };
    const box = e.currentTarget.getBoundingClientRect();
    lastBurst.current += 1;
    const id = lastBurst.current;
    setBursts((all) => [...all, { id, x: e.clientX - box.left, y: e.clientY - box.top }]);
    window.setTimeout(() => setBursts((all) => all.filter((burst) => burst.id !== id)), BURST_MS);
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
      {records.length === 0 && (
        <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm text-muted">
          Aucune série validée pour l’instant : les muscles se coloreront après ta première séance.{' '}
          <Link to="/gym" className="font-semibold text-accent">
            Aller à la salle
          </Link>
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <div className="w-36">
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
      </div>
      <div
        className="relative isolate mt-2 min-h-64 flex-1 touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {/* Behind the figure: a gym corner in the colour of the moment, and a burst under each touch. */}
        <div
          className="pointer-events-none body-gym absolute inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          {bursts.map((burst) => (
            <span key={burst.id} className="ring-burst" style={{ left: burst.x, top: burst.y }} />
          ))}
        </div>
        <BodyMap
          key={view}
          view={view}
          colors={colors}
          selected={selected}
          onSelect={setSelected}
          className="absolute inset-0 block size-full py-2 motion-safe:animate-fade-in"
        />
      </div>
      <div className="mt-2">
        <RecencyLegend thresholds={settings} />
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

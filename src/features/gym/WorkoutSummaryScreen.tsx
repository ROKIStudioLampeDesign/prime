import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { CheckIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import type { WorkoutSet } from '../../db/db';
import { getWorkout, getWorkoutSets } from '../../db/workouts';
import { workoutStats } from '../../domain/workout';
import { formatDuration, formatVolume, formatWeight } from '../../lib/format';
import { SaveTemplateSheet } from './SaveTemplateSheet';
import { exerciseName, useExercisesById } from './exerciseData';
import { workoutTitle } from './workoutLabels';

/** Heaviest set, ties broken by reps. */
function bestSet(sets: WorkoutSet[]): WorkoutSet | undefined {
  return [...sets].sort((a, b) => b.weightKg - a.weightKg || b.reps - a.reps)[0];
}

export function WorkoutSummaryScreen() {
  const workoutId = Number(useParams().id);
  const workout = useLiveQuery(async () => (await getWorkout(workoutId)) ?? null, [workoutId]);
  const sets = useLiveQuery(() => getWorkoutSets(workoutId), [workoutId]);
  const exercises = useExercisesById();
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saved, setSaved] = useState(false);

  if (workout === undefined || sets === undefined || exercises === undefined) {
    return (
      <Screen title="Résumé" back backFallback="/gym">
        <Loading />
      </Screen>
    );
  }
  if (workout === null) {
    return (
      <Screen title="Résumé" back backFallback="/gym">
        <EmptyState title="Séance introuvable" />
      </Screen>
    );
  }

  const stats = workoutStats(workout, sets);
  const byExercise = new Map<number, WorkoutSet[]>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);

  return (
    <Screen title="Séance terminée" back backFallback="/gym">
      <div className="flex flex-col items-center py-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg">
          <CheckIcon className="size-8" strokeWidth={2.6} />
        </span>
        <p className="mt-3 text-lg font-semibold">{workoutTitle(workout)}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Tile label="Durée" value={stats.durationMs === undefined ? '—' : formatDuration(stats.durationMs)} />
        <Tile label="Volume total" value={formatVolume(stats.volumeKg)} />
        <Tile label="Séries" value={String(stats.completedSets)} />
        <Tile label="Exercices" value={String(stats.exercises)} />
      </dl>

      {byExercise.size > 0 && (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
          {[...byExercise.entries()].map(([exerciseId, exSets]) => {
            const best = bestSet(exSets);
            return (
              <li key={exerciseId} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{exerciseName(exercises, exerciseId)}</p>
                  <p className="text-xs text-muted tabular-nums">
                    {exSets.length} série{exSets.length > 1 ? 's' : ''}
                    {best && ` · meilleure : ${formatWeight(best.weightKg)} kg × ${best.reps}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {sets.length > 0 && (
          <Button variant="secondary" disabled={saved} onClick={() => setSavingTemplate(true)}>
            {saved ? 'Modèle enregistré ✓' : 'Enregistrer comme modèle'}
          </Button>
        )}
        <Link
          to="/gym"
          replace
          className="flex min-h-12 items-center justify-center rounded-xl bg-accent font-semibold text-accent-fg"
        >
          Retour au calendrier
        </Link>
      </div>

      <SaveTemplateSheet
        workoutId={workout.id}
        open={savingTemplate}
        defaultName={workout.name ?? 'Ma séance'}
        onClose={() => setSavingTemplate(false)}
        onSaved={() => {
          setSavingTemplate(false);
          setSaved(true);
        }}
      />
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

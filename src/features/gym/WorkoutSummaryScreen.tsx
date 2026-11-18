import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { BigNumber } from '../../components/BigNumber';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { CheckIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import type { WorkoutSet } from '../../db/db';
import { getTemplate } from '../../db/templates';
import { getWorkout, getWorkoutSets } from '../../db/workouts';
import { workoutStats } from '../../domain/workout';
import { formatInteger, setLoadLabel } from '../../lib/format';
import { LiftResults } from './LiftResult';
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
  const templateId = workout ? workout.templateId : undefined;
  const template = useLiveQuery(
    async () => (templateId === undefined ? undefined : getTemplate(templateId)),
    [templateId],
  );
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
      <section aria-label="Bilan" className="bleed bg-gym py-4 text-on-gym">
        <p className="flex items-center gap-2 text-[1.625rem] leading-tight headline">
          <CheckIcon className="size-7 shrink-0" strokeWidth={3} />
          <span className="truncate">{workoutTitle(workout)}</span>
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {stats.durationMs === undefined ? (
            <Tile label="Durée" value="—" />
          ) : (
            <Tile label="Durée" value={String(Math.floor(stats.durationMs / 60_000))} unit="min" />
          )}
          <Tile label="Volume total" value={formatInteger(stats.volumeKg)} unit="kg" />
          <Tile label="Séries" value={String(stats.completedSets)} />
          <Tile label="Exercices" value={String(stats.exercises)} />
        </dl>
      </section>

      <LiftResults workout={workout} sets={sets} exercises={exercises} />

      {/* finishWorkout stamps the template with the workout's end time when it updated it. */}
      {template && workout.endedAt !== undefined && template.updatedAt >= workout.endedAt && (
        <p role="status" className="mt-3 text-sm font-semibold text-muted">
          Modèle « {template.name} » mis à jour : ta prochaine séance reprendra ces séries.
        </p>
      )}

      {byExercise.size > 0 && (
        <ul className="mt-2 divide-y divide-line border-b border-line">
          {[...byExercise.entries()].map(([exerciseId, exSets]) => {
            const best = bestSet(exSets);
            return (
              <li key={exerciseId} className="flex min-h-15 items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{exerciseName(exercises, exerciseId)}</p>
                  <p className="text-[13px] font-semibold text-muted tabular-nums">
                    {exSets.length} série{exSets.length > 1 ? 's' : ''}
                    {best && ` · meilleure : ${setLoadLabel(best)} × ${best.reps}`}
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
          className="flex min-h-12 items-center justify-center bg-accent-fill font-black text-accent-fg [font-stretch:112%] active:opacity-80"
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

/** A figure of the cobalt summary band. */
function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="@container min-w-0">
      <dt className="text-xs font-extrabold">{label}</dt>
      <dd className="mt-1">
        <BigNumber value={value} unit={unit} maxRem={2.5} className="leading-none" />
      </dd>
    </div>
  );
}

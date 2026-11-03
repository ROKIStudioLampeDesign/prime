import { BottomSheet } from '../../components/BottomSheet';
import type { Exercise } from '../../db/db';
import type { LocalDate } from '../../domain/date';
import {
  recentExercises,
  setsInLastDays,
  type MuscleRecency,
  type RecencyOptions,
  type TrainingRecord,
} from '../../domain/muscleRecency';
import { MUSCLES, type MuscleId } from '../../domain/muscles';
import { agoLabel, longDate, shortDate } from './labels';

interface MuscleSheetProps {
  muscle: MuscleId | undefined;
  recency: MuscleRecency | undefined;
  color: string | undefined;
  records: readonly TrainingRecord[];
  exercises: ReadonlyMap<number, Exercise>;
  options: RecencyOptions;
  today: LocalDate;
  onClose: () => void;
}

export function MuscleSheet({
  muscle,
  recency,
  color,
  records,
  exercises,
  options,
  today,
  onClose,
}: MuscleSheetProps) {
  const label = muscle ? MUSCLES[muscle].label : '';
  return (
    <BottomSheet
      open={muscle !== undefined}
      onClose={onClose}
      title={label}
      header={
        <div className="flex items-center gap-3">
          <span className="size-4 shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
          <h2 className="text-lg font-semibold">{label}</h2>
        </div>
      }
    >
      {muscle && recency && (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-bg p-3">
              <dt className="text-xs text-muted">Dernier entraînement</dt>
              <dd className="mt-0.5 text-lg font-bold first-letter:uppercase">{agoLabel(recency.days)}</dd>
              {recency.lastDate && <dd className="text-xs text-muted">{longDate(recency.lastDate)}</dd>}
            </div>
            <div className="rounded-xl bg-bg p-3">
              <dt className="text-xs text-muted">Séries sur 7 jours</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums">
                {setsInLastDays(muscle, records, today, 7, options)}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="muscle-exercises">
            <h3 id="muscle-exercises" className="mb-1.5 text-sm font-semibold text-muted">
              Derniers exercices
            </h3>
            <RecentList muscle={muscle} records={records} exercises={exercises} options={options} />
          </section>
          {!options.countSecondary && (
            <p className="text-xs text-muted">Seuls les exercices où ce muscle est principal sont comptés.</p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function RecentList({
  muscle,
  records,
  exercises,
  options,
}: {
  muscle: MuscleId;
  records: readonly TrainingRecord[];
  exercises: ReadonlyMap<number, Exercise>;
  options: RecencyOptions;
}) {
  const recent = recentExercises(muscle, records, options, 3);
  if (recent.length === 0) {
    return <p className="text-sm text-muted">Aucun exercice enregistré pour ce muscle.</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl bg-bg">
      {recent.map((r) => (
        <li key={r.exerciseId} className="flex min-h-12 items-center gap-3 px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate">{exercises.get(r.exerciseId)?.name ?? 'Exercice inconnu'}</span>
            {r.asSecondary && <span className="block text-xs text-muted">en secondaire</span>}
          </span>
          <span className="shrink-0 text-sm text-muted">{shortDate(r.date)}</span>
        </li>
      ))}
    </ul>
  );
}

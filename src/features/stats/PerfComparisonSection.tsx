import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router';
import { Loading } from '../../components/Loading';
import { SegmentedControl } from '../../components/SegmentedControl';
import { listExercises } from '../../db/exercises';
import { listExerciseHistory } from '../../db/stats';
import { addDays, type LocalDate } from '../../domain/date';
import {
  comparePeriods,
  compareWithMonthBefore,
  trendCounts,
  type BestSet,
  type PerfComparison,
} from '../../domain/perfComparison';
import { formatWeight, formatWeightChange } from '../../lib/format';
import { BandTile } from './shared';

type Mode = 'week' | 'month';
const MODES = [
  { value: 'week' as const, label: '7 jours' },
  { value: 'month' as const, label: 'Mois' },
];

function setLabel(set: BestSet | undefined): string {
  if (!set) return '—';
  return `${set.bodyweight ? 'PDC' : formatWeight(set.weightKg)} × ${set.reps}`;
}

function deltaLabel(row: PerfComparison): string {
  if (row.trend === 'new') return 'Nouveau';
  if (row.delta === undefined) return '—';
  if (row.after.bodyweight) {
    const reps = Math.round(row.delta);
    return reps === 0 ? '=' : `${reps > 0 ? '+' : '−'}${Math.abs(reps)} rep${Math.abs(reps) > 1 ? 's' : ''}`;
  }
  return row.trend === 'same' ? '=' : formatWeightChange(row.delta);
}

const TREND_COLOR = { up: 'text-accent', down: 'text-danger', same: '', new: 'text-muted' };

/**
 * Your performance exercise by exercise: the best set of the last 7 days against the 7 days before,
 * or your last session against the one about a month before. Only finished workouts, only your sets.
 */
export function PerfComparisonSection({ today }: { today: LocalDate }) {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('perfs') === 'mois' ? 'month' : 'week';
  const history = useLiveQuery(listExerciseHistory);
  const exercises = useLiveQuery(listExercises);

  function setMode(next: Mode) {
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next === 'month') out.set('perfs', 'mois');
        else out.delete('perfs');
        return out;
      },
      { replace: true },
    );
  }

  return (
    <section aria-labelledby="perfs">
      <h2 id="perfs" className="text-[1.375rem] leading-tight headline">
        Perfs
      </h2>
      <div className="mt-2">
        <SegmentedControl label="Comparer" options={MODES} value={mode} onChange={setMode} />
      </div>

      {history === undefined || exercises === undefined ? (
        <Loading />
      ) : (
        (() => {
          const rows =
            mode === 'week'
              ? comparePeriods(
                  history,
                  { from: addDays(today, -6), to: today },
                  { from: addDays(today, -13), to: addDays(today, -7) },
                )
              : compareWithMonthBefore(history, today);
          if (rows.length === 0) {
            return (
              <p className="mt-4 border-2 border-dashed border-line px-6 py-8 text-center text-sm font-semibold text-muted">
                Pas de séance terminée sur cette période.
              </p>
            );
          }
          const names = new Map(exercises.map((e) => [e.id, e.name]));
          const counts = trendCounts(rows);
          const sorted = rows
            .map((r) => ({ ...r, name: names.get(r.exerciseId) ?? 'Exercice supprimé' }))
            .sort((a, b) => a.name.localeCompare(b.name));
          return (
            <>
              <dl className="mt-3 edge grid grid-cols-3 gap-0.5">
                <BandTile tone="gym" label="En progrès" value={String(counts.up)} />
                <BandTile tone="gym" label="Stables" value={String(counts.same)} />
                <BandTile tone="gym" label="En baisse" value={String(counts.down)} />
              </dl>
              <table className="mt-3 w-full text-left">
                <thead className="text-xs font-extrabold text-muted">
                  <tr>
                    <th className="py-1 font-extrabold">Exercice</th>
                    <th className="py-1 text-right font-extrabold">
                      {mode === 'week' ? 'Avant' : 'Il y a 1 mois'}
                    </th>
                    <th className="py-1 text-right font-extrabold">
                      {mode === 'week' ? '7 jours' : 'Dernière'}
                    </th>
                    <th className="py-1 text-right font-extrabold">1RM est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-y border-line">
                  {sorted.map((r) => (
                    <tr key={r.exerciseId} className="h-13">
                      <td className="w-full py-2 pr-2 text-[15px] leading-tight font-extrabold">{r.name}</td>
                      <td className="py-2 pl-1 text-right text-sm font-bold whitespace-nowrap text-muted tabular-nums">
                        {setLabel(r.before)}
                      </td>
                      <td className="py-2 pl-2 text-right text-sm font-black whitespace-nowrap tabular-nums">
                        {setLabel(r.after)}
                      </td>
                      <td
                        className={`py-2 pl-2 text-right text-sm font-black whitespace-nowrap tabular-nums ${TREND_COLOR[r.trend]}`}
                      >
                        {deltaLabel(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
        })()
      )}
    </section>
  );
}

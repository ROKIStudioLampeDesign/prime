import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSearchParams } from 'react-router';
import { Loading } from '../../components/Loading';
import { SegmentedControl } from '../../components/SegmentedControl';
import { listExercises } from '../../db/exercises';
import { listExerciseHistory } from '../../db/stats';
import { addDays, fromLocalDate, monthBounds, type LocalDate } from '../../domain/date';
import {
  compareFirstAndLast,
  comparePeriods,
  trendCounts,
  type BestSet,
  type PerfComparison,
} from '../../domain/perfComparison';
import { weekEnd } from '../../domain/week';
import { formatWeight, formatWeightChange } from '../../lib/format';
import { BandTile } from './shared';

type Mode = 'week' | 'month';
const MODES = [
  { value: 'week' as const, label: 'Semaine' },
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
 * Your performance exercise by exercise: the best set of the shown week against the week before,
 * or the first session of the month against the last one. Only finished workouts, only your sets.
 */
export function PerfComparisonSection({ weekOf, today }: { weekOf: LocalDate; today: LocalDate }) {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('perfs') === 'mois' ? 'month' : 'week';
  const history = useLiveQuery(listExerciseHistory);
  const exercises = useLiveQuery(listExercises);

  // The month of the shown week's last day, or of today for the current week.
  const end = weekEnd(weekOf);
  const monthDay = end > today ? today : end;
  const month = { year: Number(monthDay.slice(0, 4)), month: Number(monthDay.slice(5, 7)) };

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

  const period =
    mode === 'week'
      ? `${format(fromLocalDate(weekOf), 'd MMM', { locale: fr })} – ${format(fromLocalDate(end), 'd MMM', { locale: fr })} contre la semaine d’avant`
      : `${format(fromLocalDate(monthBounds(month).from), 'MMMM yyyy', { locale: fr })} : première séance contre la dernière`;

  return (
    <section className="mt-8" aria-labelledby="perfs">
      <h2 id="perfs" className="text-[1.375rem] leading-tight headline">
        Perfs
      </h2>
      <div className="mt-2">
        <SegmentedControl label="Comparer" options={MODES} value={mode} onChange={setMode} />
      </div>
      <p className="mt-2 text-[13px] font-bold text-muted first-letter:uppercase">{period}</p>

      {history === undefined || exercises === undefined ? (
        <Loading />
      ) : (
        (() => {
          const rows =
            mode === 'week'
              ? comparePeriods(
                  history,
                  { from: weekOf, to: end },
                  { from: addDays(weekOf, -7), to: addDays(weekOf, -1) },
                )
              : compareFirstAndLast(history, monthBounds(month));
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
                    <th className="py-1 text-right font-extrabold">{mode === 'week' ? 'Avant' : 'Début'}</th>
                    <th className="py-1 text-right font-extrabold">
                      {mode === 'week' ? 'Cette sem.' : 'Fin'}
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
              <p className="mt-3 text-xs font-semibold text-muted">
                Meilleure série de chaque exercice, jugée sur le 1RM estimé (aux répétitions pour les
                exercices au poids du corps). Seules tes séances terminées comptent.
              </p>
            </>
          );
        })()
      )}
    </section>
  );
}

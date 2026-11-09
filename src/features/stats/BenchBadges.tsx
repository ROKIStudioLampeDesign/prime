import { BenchBadge } from '../../components/BenchBadge';
import { benchBadgeDates, benchBadges, benchRankLabel } from '../../domain/streaks';
import type { HistorySet } from '../../domain/strength';
import { shortDateLabel, toTime } from './chartUtils';

/** Bench milestones every 10 kg: unlocked plates with their date, the next ones with what's left. */
export function BenchBadges({ bestKg, history }: { bestKg: number; history: readonly HistorySet[] }) {
  const badges = benchBadges(bestKg);
  const dates = benchBadgeDates(
    history,
    badges.map((b) => b.kg),
  );
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <section aria-labelledby="bench-badges" className="border-b border-line py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="bench-badges" className="text-xl leading-tight headline">
          Badges
        </h3>
        <p className="text-sm font-bold text-muted tabular-nums">
          {unlocked} / {badges.length}
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4">
        {badges.map((b) => {
          const date = dates.get(b.kg);
          return (
            <li key={b.kg} className="flex flex-col items-center text-center">
              <BenchBadge kg={b.kg} unlocked={b.unlocked} />
              <p className={`mt-0.5 text-sm font-black ${b.unlocked ? '' : 'text-muted'}`}>
                {benchRankLabel(b.kg)}
              </p>
              {b.unlocked && (
                <p className="text-xs font-bold text-muted tabular-nums">
                  {date ? shortDateLabel(toTime(date)) : 'Débloqué'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

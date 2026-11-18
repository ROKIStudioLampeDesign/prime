import { LiftBadge } from '../../components/LiftBadge';
import { liftBadgeDates, liftBadges, liftRankLabel, TRACKED_LIFTS, type LiftId } from '../../domain/lifts';
import type { HistorySet } from '../../domain/strength';
import { shortDateLabel, toTime } from './chartUtils';

interface LiftBadgesProps {
  lift: LiftId;
  bestKg: number;
  history: readonly HistorySet[];
}

/** A lift's milestones: unlocked ones with their date, the next ones locked. */
export function LiftBadges({ lift, bestKg, history }: LiftBadgesProps) {
  const scale = TRACKED_LIFTS[lift];
  const badges = liftBadges(scale, bestKg);
  const dates = liftBadgeDates(
    history,
    badges.map((b) => b.kg),
  );
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <section aria-labelledby="lift-badges" className="border-b border-line py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="lift-badges" className="text-xl leading-tight headline">
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
              <LiftBadge lift={lift} kg={b.kg} unlocked={b.unlocked} />
              <p className={`mt-0.5 text-sm font-black ${b.unlocked ? '' : 'text-muted'}`}>
                {liftRankLabel(scale, b.kg)}
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

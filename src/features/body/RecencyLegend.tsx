import { colorFor, type RecencyThresholds } from '../../domain/muscleRecency';

/**
 * Gradient bar from 0 days to a bit past `staleDays`, sampled from the same `colorFor` as the map,
 * with markers at both thresholds.
 */
export function RecencyLegend({ thresholds }: { thresholds: RecencyThresholds }) {
  const max = Math.max(thresholds.staleDays + 2, Math.ceil(thresholds.staleDays * 1.25));
  const steps = 24;
  const stops = Array.from({ length: steps + 1 }, (_, i) => {
    const days = (i / steps) * max;
    return `${colorFor(days, thresholds)} ${(i / steps) * 100}%`;
  });
  const pos = (days: number) => `${(days / max) * 100}%`;

  return (
    <figure className="bg-surface p-3" aria-label="Légende des couleurs">
      <div className="relative mx-2 mt-1 mb-5">
        <div className="h-3" style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }} />
        <Marker left={pos(thresholds.freshDays)} label={`≤ ${thresholds.freshDays} j`} />
        <Marker left={pos(thresholds.staleDays)} label={`≥ ${thresholds.staleDays} j`} />
      </div>
    </figure>
  );
}

function Marker({ left, label }: { left: string; label: string }) {
  return (
    <div className="absolute top-0 -translate-x-1/2" style={{ left }}>
      <div className="mx-auto h-4 w-0.5 bg-fg" />
      <div className="mt-0.5 text-[11px] font-extrabold whitespace-nowrap tabular-nums">{label}</div>
    </div>
  );
}

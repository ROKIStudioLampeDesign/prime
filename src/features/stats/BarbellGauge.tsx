import { useId } from 'react';
import { barLoading, plateCounts, type PlateKg } from '../../domain/plates';
import { formatWeight } from '../../lib/format';

/**
 * Calibrated competition plates (powerlifting): official colours, real sizes in mm. The bar is
 * drawn to scale, 1 SVG unit = 1 mm. `ink` says whether the weight printed on the face is dark.
 */
const PLATE: Record<PlateKg, { color: string; diameter: number; thickness: number; ink: boolean }> = {
  20: { color: 'var(--color-plate-20)', diameter: 450, thickness: 22, ink: false },
  10: { color: 'var(--color-plate-10)', diameter: 325, thickness: 21, ink: false },
  5: { color: 'var(--color-plate-5)', diameter: 228, thickness: 19, ink: true },
  2.5: { color: 'var(--color-plate-2-5)', diameter: 190, thickness: 15, ink: false },
  1.25: { color: 'var(--color-plate-1-25)', diameter: 160, thickness: 12, ink: true },
};
const WIDTH = 2240;
const HEIGHT = 460;
const AXIS = HEIGHT / 2;
const CENTER = WIDTH / 2;
const SHAFT_HALF = 655; // inner collar to inner collar: 1310 mm
const SHAFT_D = 28;
const COLLAR = { width: 30, diameter: 80 };
const SLEEVE = { length: 415, diameter: 50 };
const CLAMP = { width: 40, diameter: 70 };
const GAP = 2;

/** Plates along a sleeve (offset from its inner end); squeezed if they wouldn't fit on it. */
function layout(plates: readonly PlateKg[]): { kg: PlateKg; at: number; thickness: number }[] {
  const room = SLEEVE.length - CLAMP.width - GAP;
  const total = plates.reduce((s, kg) => s + PLATE[kg].thickness + GAP, 0);
  const squeeze = total > room ? room / total : 1;
  let at = GAP;
  return plates.map((kg) => {
    const thickness = PLATE[kg].thickness * squeeze;
    const placed = { kg, at, thickness };
    at += thickness + GAP * squeeze;
    return placed;
  });
}

/** "2 × 20 kg et 1 × 10 kg de chaque côté", or the bare bar. */
export function loadingLabel(totalKg: number): string {
  const counts = plateCounts(barLoading(totalKg));
  if (counts.length === 0) return `${formatWeight(Math.max(totalKg, 20))} kg : barre seule`;
  const list = counts.map((c) => `${c.count} × ${formatWeight(c.kg)} kg`);
  const joined = list.length > 1 ? `${list.slice(0, -1).join(', ')} et ${list.at(-1) ?? ''}` : list.join('');
  return `${formatWeight(totalKg)} kg : ${joined} de chaque côté`;
}

/** An Olympic bar loaded with `totalKg`, side view, to scale. One side mirrors the other. */
export function BarbellGauge({ totalKg }: { totalKg: number }) {
  const knurl = useId();
  const placed = layout(barLoading(totalKg));
  const end = placed.reduce((e, p) => Math.max(e, p.at + p.thickness), 0) + GAP;

  const side = (dir: 1 | -1) => {
    const x = (offset: number, w: number) => CENTER + (dir > 0 ? offset : -offset - w);
    const sleeveStart = SHAFT_HALF + COLLAR.width;
    return (
      <g>
        <rect
          x={x(SHAFT_HALF, COLLAR.width)}
          y={AXIS - COLLAR.diameter / 2}
          width={COLLAR.width}
          height={COLLAR.diameter}
          rx={4}
          fill="var(--color-bar-collar)"
        />
        <rect
          x={x(sleeveStart, SLEEVE.length)}
          y={AXIS - SLEEVE.diameter / 2}
          width={SLEEVE.length}
          height={SLEEVE.diameter}
          fill="var(--color-sleeve)"
        />
        {placed.map((p, i) => {
          const { diameter, color } = PLATE[p.kg];
          return (
            <rect
              key={i}
              x={x(sleeveStart + p.at, p.thickness)}
              y={AXIS - diameter / 2}
              width={p.thickness}
              height={diameter}
              rx={Math.min(4, p.thickness / 3)}
              fill={color}
              className={p.kg === 2.5 ? 'stroke-muted' : 'stroke-ink'}
              strokeOpacity={0.45}
              strokeWidth={p.kg === 2.5 ? 3 : 2}
            />
          );
        })}
        <rect
          x={x(sleeveStart + end, CLAMP.width)}
          y={AXIS - CLAMP.diameter / 2}
          width={CLAMP.width}
          height={CLAMP.diameter}
          rx={5}
          fill="var(--color-clamp)"
        />
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Barre chargée à ${loadingLabel(totalKg)}`}
    >
      <defs>
        <pattern id={knurl} width={14} height={SHAFT_D} patternUnits="userSpaceOnUse">
          <rect width={14} height={SHAFT_D} fill="var(--color-bar)" />
          <path d={`M0 ${SHAFT_D} L10 0`} stroke="var(--color-bar-knurl)" strokeWidth={3} />
        </pattern>
      </defs>
      <rect
        x={CENTER - SHAFT_HALF}
        y={AXIS - SHAFT_D / 2}
        width={SHAFT_HALF * 2}
        height={SHAFT_D}
        fill={`url(#${knurl})`}
      />
      {/* A bench bar's knurling stops short of the centre. */}
      <rect x={CENTER - 80} y={AXIS - SHAFT_D / 2} width={160} height={SHAFT_D} fill="var(--color-bar)" />
      {side(1)}
      {side(-1)}
    </svg>
  );
}

/** Largest face drawn in the legend (px), for a 450 mm plate; smaller plates scale down. */
const FACE_PX = 52;

/** The plates of one side, seen face on, with how many of each: what to load on the bar. */
export function PlateFaces({ totalKg }: { totalKg: number }) {
  const counts = plateCounts(barLoading(totalKg));
  if (counts.length === 0) return <p className="text-xs font-semibold text-muted">Barre seule</p>;
  return (
    <div>
      <p className="text-xs font-semibold text-muted">De chaque côté</p>
      <ul className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2" aria-label="Disques de chaque côté">
        {counts.map(({ kg, count }) => {
          const { diameter, color, ink } = PLATE[kg];
          const r = diameter / 2;
          const size = (diameter / 450) * FACE_PX;
          return (
            <li key={kg} className="flex flex-col items-center gap-0.5">
              <svg
                viewBox={`${-r} ${-r} ${diameter} ${diameter}`}
                width={size}
                height={size}
                aria-hidden="true"
              >
                <circle r={r - 2} fill={color} className="stroke-ink" strokeOpacity={0.45} strokeWidth={4} />
                {/* Raised rim, chrome hub and the sleeve hole of a calibrated plate. */}
                <circle
                  r={r * 0.86}
                  fill="none"
                  className="stroke-ink"
                  strokeOpacity={0.22}
                  strokeWidth={6}
                />
                <circle r={Math.min(44, r * 0.3)} fill="var(--color-sleeve)" />
                <circle r={Math.min(26, r * 0.18)} className="fill-bg" />
                {/* The weight is printed only where it stays readable; the caption always says it. */}
                {diameter >= 325 && (
                  <text
                    y={-r * 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={r * 0.34}
                    fontWeight={900}
                    fill={ink ? 'var(--color-ink)' : 'var(--color-on-ink)'}
                  >
                    {formatWeight(kg)}
                  </text>
                )}
              </svg>
              <span className="text-xs font-extrabold tabular-nums">
                {count} × {formatWeight(kg)} kg
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

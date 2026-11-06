import { useId } from 'react';
import { barbellLoad, type PlateKg } from '../../domain/plates';
import { formatWeight } from '../../lib/format';

/** Real Olympic dimensions in mm: the SVG is drawn to scale, 1 unit = 1 mm. */
const PLATE: Record<PlateKg, { color: string; diameter: number; thickness: number }> = {
  25: { color: 'var(--color-plate-25)', diameter: 450, thickness: 64 },
  20: { color: 'var(--color-plate-20)', diameter: 450, thickness: 56 },
  15: { color: 'var(--color-plate-15)', diameter: 450, thickness: 48 },
  10: { color: 'var(--color-plate-10)', diameter: 450, thickness: 40 },
  5: { color: 'var(--color-plate-5)', diameter: 228, thickness: 30 },
  2.5: { color: 'var(--color-plate-2-5)', diameter: 190, thickness: 22 },
  1.25: { color: 'var(--color-plate-1-25)', diameter: 160, thickness: 16 },
};
const WIDTH = 2240;
const HEIGHT = 470;
const FLOOR = 462;
/** The bar rests on its biggest plates: its axis is a plate radius above the floor. */
const AXIS = FLOOR - 225;
const CENTER = WIDTH / 2;
const SHAFT_HALF = 655; // inner collar to inner collar: 1310 mm
const SHAFT_D = 28;
const COLLAR = { width: 30, diameter: 80 };
const SLEEVE = { length: 415, diameter: 50 };
const CLAMP = { width: 40, diameter: 70 };
const GAP = 3;

interface Placed {
  kg: PlateKg;
  /** Offset from the inner end of the sleeve, and drawn thickness (mm). */
  at: number;
  thickness: number;
  ghost: boolean;
}

/** Plates along a sleeve; squeezed proportionally if a heavy goal wouldn't fit on it. */
function layout(current: PlateKg[], missing: PlateKg[]): { plates: Placed[]; end: number } {
  const all = [...current.map((kg) => ({ kg, ghost: false })), ...missing.map((kg) => ({ kg, ghost: true }))];
  const room = SLEEVE.length - CLAMP.width - GAP;
  const total = all.reduce((s, p) => s + PLATE[p.kg].thickness + GAP, 0);
  const squeeze = total > room ? room / total : 1;
  const plates: Placed[] = [];
  let at = GAP;
  for (const p of all) {
    const thickness = PLATE[p.kg].thickness * squeeze;
    plates.push({ ...p, at, thickness });
    at += thickness + GAP * squeeze;
  }
  return { plates, end: at };
}

interface BarbellGaugeProps {
  bestKg: number;
  goalKg: number;
}

/**
 * The bench goal as a loaded Olympic bar, drawn to scale: the best lift in official plate
 * colours, the plates still missing for the goal dashed. One side mirrors the other.
 */
export function BarbellGauge({ bestKg, goalKg }: BarbellGaugeProps) {
  const knurl = useId();
  const { current, missing } = barbellLoad(bestKg, goalKg);
  const { plates, end } = layout(current, missing);
  const label =
    missing.length > 0
      ? `Barre chargée à ${formatWeight(Math.max(bestKg, 20))} kg ; il manque ${missing.map((kg) => `${formatWeight(kg)} kg`).join(', ')} de chaque côté pour ${formatWeight(goalKg)} kg`
      : `Barre chargée à ${formatWeight(bestKg)} kg : objectif de ${formatWeight(goalKg)} kg atteint`;

  // One side, drawn for the right (+1) or mirrored for the left (-1).
  const side = (dir: 1 | -1) => {
    const x = (offset: number, w: number) => (dir > 0 ? offset : -offset - w);
    const collarStart = SHAFT_HALF;
    const sleeveStart = collarStart + COLLAR.width;
    return (
      <g transform={`translate(${CENTER} 0)`}>
        <rect
          x={x(collarStart, COLLAR.width)}
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
        {plates.map((p, i) => {
          const { diameter, color } = PLATE[p.kg];
          const px = x(sleeveStart + p.at, p.thickness);
          const y = AXIS - diameter / 2;
          const rx = Math.min(8, p.thickness / 3);
          return p.ghost ? (
            <rect
              key={i}
              x={px + 3}
              y={y + 3}
              width={Math.max(1, p.thickness - 6)}
              height={diameter - 6}
              rx={rx}
              fill="none"
              stroke={color}
              strokeWidth={6}
              strokeDasharray="22 16"
            />
          ) : (
            <g key={i}>
              <rect x={px} y={y} width={p.thickness} height={diameter} rx={rx} fill={color} />
              {/* The raised lip of a bumper plate, then its outline. */}
              <rect
                x={px}
                y={y + diameter * 0.06}
                width={p.thickness}
                height={diameter * 0.88}
                fill="none"
                className="stroke-ink"
                strokeOpacity={0.3}
                strokeWidth={4}
              />
              <rect
                x={px}
                y={y}
                width={p.thickness}
                height={diameter}
                rx={rx}
                fill="none"
                className="stroke-ink"
                strokeOpacity={0.5}
                strokeWidth={3}
              />
            </g>
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
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full" role="img" aria-label={label}>
      <defs>
        <pattern id={knurl} width={14} height={SHAFT_D} patternUnits="userSpaceOnUse">
          <rect width={14} height={SHAFT_D} fill="var(--color-bar)" />
          <path d={`M0 ${SHAFT_D} L10 0`} stroke="var(--color-bar-knurl)" strokeWidth={3} />
        </pattern>
      </defs>
      <line x1={0} x2={WIDTH} y1={FLOOR + 4} y2={FLOOR + 4} className="stroke-line" strokeWidth={6} />
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

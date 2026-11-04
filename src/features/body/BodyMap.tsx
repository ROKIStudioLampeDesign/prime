import { MUSCLES, type BodyView, type MuscleId } from '../../domain/muscles';
import {
  approxArea,
  DETAILS,
  HEAD,
  MUSCLE_SHAPES,
  SILHOUETTE_HALF,
  VIEWBOX,
  type MuscleShape,
} from './bodyGeometry';

/** Flips a left-half shape onto the right half (mirror around x = 100). */
const MIRROR = 'matrix(-1 0 0 1 200 0)';

interface BodyMapProps {
  view: BodyView;
  colors: Readonly<Record<MuscleId, string>>;
  selected?: MuscleId;
  onSelect: (muscle: MuscleId) => void;
  className?: string;
}

interface Placed {
  key: string;
  shape: MuscleShape;
  transform?: string;
  /** Only one copy per muscle is focusable and announced. */
  primaryCopy: boolean;
}

function placeShapes(shapes: readonly MuscleShape[]): Placed[] {
  const seen = new Set<MuscleId>();
  return shapes.flatMap((shape, i) => {
    const copies = shape.mirror ? [undefined, MIRROR] : [undefined];
    return copies.map((transform, c) => {
      const primaryCopy = !seen.has(shape.muscle);
      seen.add(shape.muscle);
      return { key: `${i}-${c}`, shape, transform, primaryCopy };
    });
  });
}

/**
 * Stylized front/back body. Visible muscle paths take their fill from `colors`; a transparent hit
 * layer on top (wide transparent stroke) makes thin muscles easy to tap with a finger.
 */
export function BodyMap({ view, colors, selected, onSelect, className = '' }: BodyMapProps) {
  const placed = placeShapes(MUSCLE_SHAPES[view]);
  // Hit areas overlap at their padded edges; the later one wins, so draw large muscles first and
  // let thin ones (side delts, front traps) sit on top and keep their area.
  const hitOrder = [...placed].sort((a, b) => approxArea(b.shape.d) - approxArea(a.shape.d));

  return (
    <svg
      viewBox={VIEWBOX}
      className={className}
      role="group"
      aria-label={view === 'front' ? 'Corps, vue de face' : 'Corps, vue de dos'}
    >
      <g className="fill-body" aria-hidden="true">
        <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
        <path d={SILHOUETTE_HALF} />
        <path d={SILHOUETTE_HALF} transform={MIRROR} />
      </g>

      <g aria-hidden="true" strokeLinejoin="round">
        {placed.map(({ key, shape, transform }) => (
          <path
            key={key}
            d={shape.d}
            transform={transform}
            data-muscle={shape.muscle}
            fill={colors[shape.muscle]}
            className={`transition-[fill,stroke] duration-500 ${
              selected === shape.muscle ? 'stroke-fg' : 'stroke-surface'
            }`}
            strokeWidth={selected === shape.muscle ? 2 : 1.2}
          />
        ))}
      </g>

      <g
        aria-hidden="true"
        className="pointer-events-none stroke-surface"
        fill="none"
        strokeWidth={1.2}
        strokeLinecap="round"
      >
        {DETAILS[view].map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <g fill="transparent" stroke="transparent" strokeWidth={7} strokeLinejoin="round">
        {hitOrder.map(({ key, shape, transform, primaryCopy }) => (
          <path
            key={key}
            d={shape.d}
            transform={transform}
            data-muscle={shape.muscle}
            className="cursor-pointer outline-none focus-visible:stroke-fg/40"
            role={primaryCopy ? 'button' : undefined}
            tabIndex={primaryCopy ? 0 : -1}
            aria-hidden={primaryCopy ? undefined : true}
            aria-label={primaryCopy ? MUSCLES[shape.muscle].label : undefined}
            onClick={() => onSelect(shape.muscle)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(shape.muscle);
              }
            }}
          />
        ))}
      </g>
    </svg>
  );
}

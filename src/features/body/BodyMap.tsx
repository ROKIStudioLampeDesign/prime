import { useId } from 'react';
import { MUSCLES, type BodyView, type MuscleId } from '../../domain/muscles';
import { approxArea, BODY_ART, type ArtPart } from './bodyArt';

interface BodyMapProps {
  view: BodyView;
  colors: Readonly<Record<MuscleId, string>>;
  selected?: MuscleId;
  onSelect: (muscle: MuscleId) => void;
  className?: string;
}

interface Indexed {
  part: ArtPart & { m: MuscleId };
  index: number;
  /** Only one shape per muscle is focusable and announced. */
  primaryCopy: boolean;
}

const OUTLINE = 3;
const INK = 0.9;

function muscleParts(parts: readonly ArtPart[]): Indexed[] {
  const seen = new Set<MuscleId>();
  return parts.flatMap((part, index) => {
    const { m } = part;
    if (part.k !== 'muscle' || m === undefined) return [];
    const primaryCopy = !seen.has(m);
    seen.add(m);
    return [{ part: { ...part, m }, index, primaryCopy }];
  });
}

/**
 * Inked front/back body (see `bodyArt.ts`). Muscle shapes take their fill from `colors`; a
 * transparent hit layer on top (wide transparent stroke) makes thin muscles easy to tap.
 */
export function BodyMap({ view, colors, selected, onSelect, className = '' }: BodyMapProps) {
  const art = BODY_ART[view];
  const uid = useId();
  const clipId = (i: number) => `${uid}-clip-${i}`;
  const seamId = (i: number) => `${uid}-seam-${i}`;
  const muscles = muscleParts(art.parts);
  // Hit areas overlap at their padded edges; the later one wins, so draw large muscles first and
  // let thin ones sit on top and keep their area.
  const hitOrder = [...muscles].sort((a, b) => approxArea(b.part.d) - approxArea(a.part.d));
  const clipped = (i: number, part: ArtPart) => (part.clip ? `url(#${clipId(i)})` : undefined);

  return (
    <svg
      viewBox={art.viewBox}
      className={className}
      role="group"
      aria-label={view === 'front' ? 'Corps, vue de face' : 'Corps, vue de dos'}
    >
      <defs>
        {art.parts.map((part, i) =>
          part.clip ? (
            <clipPath key={i} id={clipId(i)}>
              <path d={part.clip} />
            </clipPath>
          ) : null,
        )}
        {art.seams.map((seam, i) => (
          <clipPath key={i} id={seamId(i)}>
            <path d={seam.clip} />
          </clipPath>
        ))}
      </defs>

      {/* Heavy ink contour: every solid shape drawn once with a thick stroke, under the figure. */}
      <g aria-hidden="true" className="fill-ink stroke-ink" strokeWidth={OUTLINE} strokeLinejoin="round">
        {art.parts.map((part, i) => (part.k === 'line' || part.thin ? null : <path key={i} d={part.d} />))}
      </g>

      <g aria-hidden="true" strokeLinejoin="round" strokeLinecap="round">
        {art.parts.map((part, i) => {
          if (part.k === 'line') {
            return <path key={i} d={part.d} fill="none" className="stroke-ink" strokeWidth={0.55} />;
          }
          const ink = part.noInk ? undefined : 'stroke-ink';
          const width = part.thin ? 0.35 : INK;
          if (part.k === 'muscle' && part.m !== undefined) {
            return (
              <g key={i} clipPath={clipped(i, part)}>
                <path
                  d={part.d}
                  data-muscle={part.m}
                  fill={colors[part.m]}
                  className={`transition-[fill] duration-500 ${ink ?? ''}`}
                  strokeWidth={width}
                />
              </g>
            );
          }
          return (
            <path
              key={i}
              d={part.d}
              className={`${part.k === 'tendon' ? 'fill-body-detail' : 'fill-body'} ${ink ?? ''}`}
              strokeWidth={ink ? width : 0}
            />
          );
        })}
      </g>

      <g aria-hidden="true" fill="none" className="stroke-ink" strokeWidth={0.5} strokeLinecap="round">
        {art.seams.map((seam, i) => (
          <path key={i} d={seam.d} clipPath={`url(#${seamId(i)})`} />
        ))}
      </g>

      {selected !== undefined && (
        <g aria-hidden="true" fill="none" className="pointer-events-none stroke-fg" strokeWidth={1.6}>
          {muscles
            .filter(({ part }) => part.m === selected)
            .map(({ part, index }) => (
              <g key={index} clipPath={clipped(index, part)}>
                <path d={part.d} />
              </g>
            ))}
        </g>
      )}

      <g fill="transparent" stroke="transparent" strokeWidth={6} strokeLinejoin="round">
        {hitOrder.map(({ part, index, primaryCopy }) => (
          <g key={index} clipPath={clipped(index, part)}>
            <path
              d={part.d}
              data-muscle={part.m}
              className="cursor-pointer outline-none focus-visible:stroke-fg/40"
              role={primaryCopy ? 'button' : undefined}
              tabIndex={primaryCopy ? 0 : -1}
              aria-hidden={primaryCopy ? undefined : true}
              aria-label={primaryCopy ? MUSCLES[part.m].label : undefined}
              onClick={() => onSelect(part.m)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(part.m);
                }
              }}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

import type { CSSProperties } from 'react';

/** Advance of a digit and of a separator (comma, narrow space) in em, for Archivo in `numeral`. */
const DIGIT_EM = 0.78;
const SEPARATOR_EM = 0.34;

interface BigNumberProps {
  /** Already formatted, e.g. "1 586" or "55,9". */
  value: string;
  /** Font size when the number is short enough, in rem. */
  maxRem: number;
  /** A small unit after the number (e.g. "kg"); its width is kept free. */
  unit?: string;
  className?: string;
}

/**
 * A band's headline figure, as big as the band allows: the size shrinks with the number of
 * characters so "1 586" or "155,9" stays on one line on a 375 px phone. The width comes from the
 * nearest `@container` ancestor (the band or cell).
 */
export function BigNumber({ value, maxRem, unit, className = '' }: BigNumberProps) {
  let em = 0;
  for (const char of value) em += /\d/.test(char) ? DIGIT_EM : SEPARATOR_EM;
  // 92 % of the width leaves room for rounding and the last glyph's side bearing; a unit takes
  // about 0.6 rem per letter plus the gap.
  const fit =
    em === 0
      ? `${maxRem}rem`
      : unit
        ? `min(${maxRem}rem, calc((92cqw - ${(0.6 * unit.length + 0.4).toFixed(1)}rem) / ${em.toFixed(2)}))`
        : `min(${maxRem}rem, ${(92 / em).toFixed(1)}cqw)`;
  return (
    <span className={`flex items-baseline gap-1.5 whitespace-nowrap ${className}`}>
      <span className="text-(length:--fit) numeral" style={{ '--fit': fit } as CSSProperties}>
        {value}
      </span>
      {/* The space keeps "480 kg" as text (screen readers, search); flex layout ignores it. */}
      {unit && (
        <>
          {' '}
          <span className="text-sm font-extrabold">{unit}</span>
        </>
      )}
    </span>
  );
}

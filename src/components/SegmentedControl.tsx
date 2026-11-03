import { useId } from 'react';

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * `accent` marks the choice with the accent fill (quantities); `neutral` for view switches;
   * `gym` sits on a cobalt band (white outline and fill).
   */
  tone?: 'neutral' | 'accent' | 'gym';
  /** `tabs` draws the options like the section sub-tabs (underlined), for top-level view switches. */
  variant?: 'segments' | 'tabs';
  /** Smaller text, for many short options (e.g. meal slots). */
  dense?: boolean;
  /** Rendered on a surface: uses the next surface level for the track. */
  onSurface?: boolean;
}

/**
 * Exclusive choice between a few options (Face / Dos, Portions / Grammes…). Built on native radio
 * inputs, so arrow keys, form semantics and screen readers work without extra code.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = 'neutral',
  variant = 'segments',
  dense = false,
  onSurface = false,
}: SegmentedControlProps<T>) {
  const name = useId();
  const radio = (o: { value: T }) => (
    <input
      type="radio"
      name={name}
      value={o.value}
      checked={value === o.value}
      onChange={() => onChange(o.value)}
      className="sr-only"
    />
  );

  if (variant === 'tabs') {
    return (
      <div role="radiogroup" aria-label={label} className="flex gap-5 border-b border-line">
        {options.map((o) => (
          <label
            key={o.value}
            className={`relative flex min-h-11 cursor-pointer items-center has-focus-visible:outline-2 has-focus-visible:outline-accent ${
              dense ? 'text-sm' : 'text-[15px]'
            } ${value === o.value ? 'font-extrabold text-fg' : 'font-bold text-muted'}`}
          >
            {radio(o)}
            {o.label}
            {value === o.value && (
              <span className="absolute inset-x-0 -bottom-px h-1 bg-indicator" aria-hidden="true" />
            )}
          </label>
        ))}
      </div>
    );
  }

  // Square outlined segments; the selected one is filled (yellow for `accent`, inverted otherwise).
  const selected =
    tone === 'accent'
      ? 'bg-accent-fill text-accent-fg'
      : tone === 'gym'
        ? 'bg-on-gym text-ink'
        : 'bg-fg text-bg';
  const idle = tone === 'gym' ? 'text-on-gym' : 'text-fg';
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid border-2 ${tone === 'gym' ? 'border-on-gym' : 'border-fg'} ${onSurface ? 'bg-surface' : ''}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <label
          key={o.value}
          // The focused radio is the checked one: an outline in its own text colour shows on any fill.
          className={`flex min-h-11 cursor-pointer items-center justify-center px-1 text-center font-extrabold tabular-nums has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-current ${
            dense ? 'text-xs' : 'text-sm'
          } ${value === o.value ? selected : idle}`}
        >
          {radio(o)}
          {o.label}
        </label>
      ))}
    </div>
  );
}

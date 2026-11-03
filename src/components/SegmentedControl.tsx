import { useId } from 'react';

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** `accent` marks the choice with the accent fill (settings, quantities); `neutral` for view switches. */
  tone?: 'neutral' | 'accent';
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
  dense = false,
  onSurface = false,
}: SegmentedControlProps<T>) {
  const name = useId();
  const selected =
    tone === 'accent'
      ? 'bg-accent-fill text-accent-fg ring-1 ring-accent ring-inset'
      : onSurface
        ? 'bg-surface text-fg'
        : 'bg-surface-2 text-fg';
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-1 rounded-xl p-1 ${onSurface ? 'bg-surface-2' : 'bg-surface'}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-1 text-center font-semibold tabular-nums has-focus-visible:outline-2 has-focus-visible:outline-accent ${
            dense ? 'text-xs' : 'text-sm'
          } ${value === o.value ? selected : 'text-muted'}`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

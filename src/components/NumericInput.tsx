import { useState, type InputHTMLAttributes } from 'react';
import { parseDecimal } from '../domain/number';

interface NumericInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'inputMode'
> {
  value: number;
  /** Called with every valid non-negative number typed (live), so edits persist immediately. */
  onCommit: (value: number) => void;
  /** Integers only (reps). */
  integer?: boolean;
}

const display = (value: number) => (value === 0 ? '' : String(value).replace('.', ','));

/**
 * Number input bound to stored data. While focused it keeps its own text, so live-query
 * refreshes never overwrite what is being typed (e.g. "62," before the decimals). 0 shows as
 * an empty field with a "0" placeholder.
 */
export function NumericInput({
  value,
  onCommit,
  integer = false,
  placeholder = '0',
  ...props
}: NumericInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...props}
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      placeholder={placeholder}
      value={draft ?? display(value)}
      onFocus={(e) => {
        setDraft(display(value));
        e.currentTarget.select();
      }}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        const parsed = parseDecimal(text);
        const next = parsed === undefined ? 0 : parsed;
        if (Number.isFinite(next) && next >= 0 && (!integer || Number.isInteger(next))) onCommit(next);
      }}
    />
  );
}

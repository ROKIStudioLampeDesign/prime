import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: ReactNode;
  /** Unit shown inside the field, e.g. "g" or "kcal". */
  suffix?: string;
  error?: string;
  hint?: string;
}

/** Labelled input. Text is 16 px so iOS Safari doesn't zoom in on focus. */
export function TextField({ label, suffix, error, hint, ...props }: TextFieldProps) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center rounded-xl border bg-surface px-3 focus-within:border-accent ${
          error ? 'border-danger' : 'border-line'
        }`}
      >
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descId}
          className="h-12 w-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/60"
          {...props}
        />
        {suffix && <span className="ml-2 shrink-0 text-sm text-muted">{suffix}</span>}
      </div>
      {(error || hint) && (
        <p id={descId} className={`mt-1 text-xs ${error ? 'text-danger' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

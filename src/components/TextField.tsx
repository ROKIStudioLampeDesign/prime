import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: ReactNode;
  /** Unit shown inside the field, e.g. "g" or "kcal". */
  suffix?: string;
  error?: string;
  hint?: string;
}

/** Labelled, underlined input. Text is at least 16 px so iOS Safari doesn't zoom in on focus. */
export function TextField({ label, suffix, error, hint, ...props }: TextFieldProps) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-extrabold text-muted">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center border-b-2 focus-within:border-accent ${
          error ? 'border-danger' : 'border-fg'
        }`}
      >
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descId}
          className="h-12 w-full min-w-0 flex-1 bg-transparent text-lg font-bold outline-none placeholder:font-semibold placeholder:text-muted/60"
          {...props}
        />
        {suffix && <span className="ml-2 shrink-0 text-sm font-extrabold text-muted">{suffix}</span>}
      </div>
      {(error || hint) && (
        <p id={descId} className={`mt-1 text-xs ${error ? 'text-danger' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

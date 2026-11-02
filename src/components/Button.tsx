import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg active:opacity-80',
  secondary: 'bg-surface-2 text-fg active:opacity-80',
  danger: 'bg-danger/15 text-danger active:bg-danger/25',
  ghost: 'text-accent active:bg-surface-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

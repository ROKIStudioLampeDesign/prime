import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent-fill text-accent-fg active:opacity-80',
  secondary: 'border-2 border-fg text-fg active:bg-surface',
  danger: 'bg-danger/15 text-danger active:bg-danger/25',
  ghost: 'text-accent active:bg-surface',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`flex min-h-12 items-center justify-center gap-2 px-5 font-black [font-stretch:112%] disabled:opacity-40 motion-safe:transition-transform motion-safe:duration-100 motion-safe:active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

import type { ReactNode } from 'react';

export type ProgressTone = 'accent' | 'danger' | 'muted';

const STROKE: Record<ProgressTone, string> = {
  accent: 'stroke-accent',
  danger: 'stroke-danger',
  muted: 'stroke-muted',
};
const FILL: Record<ProgressTone, string> = {
  accent: 'bg-accent-fill',
  danger: 'bg-danger',
  muted: 'bg-muted',
};

const clamp01 = (ratio: number) => Math.min(1, Math.max(0, ratio));

interface ProgressRingProps {
  ratio: number;
  tone?: ProgressTone;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}

export function ProgressRing({
  ratio,
  tone = 'accent',
  size = 128,
  strokeWidth = 10,
  children,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamp01(ratio))}
          className={`${STROKE[tone]} transition-[stroke-dashoffset] duration-500`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ ratio, tone = 'accent' }: { ratio: number; tone?: ProgressTone }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <div
        className={`h-full rounded-full ${FILL[tone]} transition-[width] duration-500`}
        style={{ width: `${clamp01(ratio) * 100}%` }}
      />
    </div>
  );
}

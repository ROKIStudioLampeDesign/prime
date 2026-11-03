import type { ReactNode } from 'react';

/** `ink` and `danger-ink` are for a domain tile (ink track); the others sit on a neutral surface. */
export type ProgressTone = 'accent' | 'danger' | 'muted' | 'ink' | 'danger-ink';

const STROKE: Record<ProgressTone, string> = {
  accent: 'stroke-accent',
  danger: 'stroke-danger',
  muted: 'stroke-muted',
  ink: 'stroke-ink',
  'danger-ink': 'stroke-danger-ink',
};
const FILL: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  danger: 'bg-danger',
  muted: 'bg-muted',
  ink: 'bg-ink',
  'danger-ink': 'bg-danger-ink',
};

const onTile = (tone: ProgressTone) => tone === 'ink' || tone === 'danger-ink';

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
          className={onTile(tone) ? 'stroke-ink/15' : 'stroke-surface-2'}
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
    <div
      className={`h-2 overflow-hidden rounded-full ${onTile(tone) ? 'bg-ink/15' : 'bg-surface-2'}`}
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full ${FILL[tone]} transition-[width] duration-500`}
        style={{ width: `${clamp01(ratio) * 100}%` }}
      />
    </div>
  );
}

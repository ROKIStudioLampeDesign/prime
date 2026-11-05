import { useId } from 'react';

/**
 * A bench milestone badge drawn as a weight plate: notched rim, ring, hub and the load in big
 * numerals. Tiers by load: bronze (< 80), silver (< 100), gold (< 120), the 120 kg goal in cobalt,
 * then black and gold. Locked badges are an outline.
 */
interface Tier {
  rim: string;
  face: string;
  ring: string;
  text: string;
}

const ELITE: Tier = { rim: '#000000', face: '#1c1c1c', ring: '#f0c23b', text: '#f0c23b' };
const TIERS: readonly { until: number; tier: Tier }[] = [
  { until: 80, tier: { rim: '#7a4a24', face: '#c9864f', ring: '#e7b48a', text: '#2b1608' } },
  { until: 100, tier: { rim: '#5d656e', face: '#c3cad2', ring: '#eef1f4', text: '#1d2227' } },
  { until: 120, tier: { rim: '#8a6410', face: '#f0c23b', ring: '#fff0b8', text: '#2e2104' } },
  { until: 130, tier: { rim: '#0f1d8c', face: '#2340ff', ring: '#f4e04d', text: '#ffffff' } },
];

export function tierFor(kg: number): Tier {
  return TIERS.find((t) => kg < t.until)?.tier ?? ELITE;
}

const NOTCHES = 16;

interface BenchBadgeProps {
  kg: number;
  unlocked: boolean;
  /** The 120 kg goal gets a ribbon. */
  goal?: boolean;
  size?: number;
}

export function BenchBadge({ kg, unlocked, goal = false, size = 96 }: BenchBadgeProps) {
  const id = useId();
  const t = tierFor(kg);
  const label = `Badge bench ${kg} kg, ${unlocked ? 'débloqué' : 'à débloquer'}`;
  const notches = Array.from({ length: NOTCHES }, (_, i) => (i * 360) / NOTCHES);

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label}>
      <defs>
        <clipPath id={`${id}-plate`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      {unlocked ? (
        <>
          {/* Rim with grip notches, then the face, a raised ring and the hub. */}
          <circle cx="50" cy="50" r="47" fill={t.rim} />
          <g clipPath={`url(#${id}-plate)`} fill={t.face}>
            {notches.map((a) => (
              <rect key={a} x="47" y="1" width="6" height="7" transform={`rotate(${a} 50 50)`} />
            ))}
          </g>
          <circle cx="50" cy="50" r="39" fill={t.face} />
          <circle cx="50" cy="50" r="33" fill="none" stroke={t.ring} strokeWidth="2.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke={t.rim} strokeWidth="0.8" opacity="0.6" />
          <circle cx="50" cy="19" r="3.2" fill={t.rim} />
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fill={t.text}
            style={{ font: '900 26px Archivo, sans-serif', fontStretch: '125%' }}
          >
            {kg}
          </text>
          <text
            x="50"
            y="71"
            textAnchor="middle"
            fill={t.text}
            style={{ font: '800 9px Archivo, sans-serif', fontStretch: '112%', letterSpacing: '0.12em' }}
          >
            KG
          </text>
          {goal && (
            <g>
              <path d="M18 80 L82 80 L78 88 L82 96 L18 96 L22 88 Z" fill={t.ring} />
              <text
                x="50"
                y="91.5"
                textAnchor="middle"
                fill={t.rim}
                style={{ font: '900 7.5px Archivo, sans-serif', letterSpacing: '0.08em' }}
              >
                OBJECTIF
              </text>
            </g>
          )}
        </>
      ) : (
        <g className="text-muted" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="46" strokeWidth="2" strokeDasharray="4 3.2" />
          <circle cx="50" cy="50" r="33" strokeWidth="1.5" opacity="0.6" />
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            style={{ font: '900 26px Archivo, sans-serif', fontStretch: '125%' }}
          >
            {kg}
          </text>
          <text
            x="50"
            y="71"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            style={{ font: '800 9px Archivo, sans-serif', letterSpacing: '0.12em' }}
          >
            KG
          </text>
        </g>
      )}
    </svg>
  );
}

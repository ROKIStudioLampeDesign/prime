import { useId, type ReactNode } from 'react';
import { benchRank, benchRankLabel } from '../domain/streaks';

/**
 * A bench milestone drawn as an original rank emblem: a faceted, riveted shield with an engraved
 * barbell and the load. Each tier adds ornaments: Bronze plain, Argent side blades, Or wings (2
 * feather rows on Or I, 3 with rays and a jewelled point on Or II), Rubis (the 120 kg goal) a
 * crown and 4 rows, Obsidienne 5 rows. Chevrons mark divisions I and II. Locked: a grey shield.
 */
interface Palette {
  metal: readonly [string, string, string];
  core: readonly [string, string];
  text: string;
  accent: string;
  gem?: string;
  rays?: string;
}

const PALETTES: readonly Palette[] = [
  {
    metal: ['#ffdcb5', '#c47a3b', '#5a2b0c'],
    core: ['#4e2410', '#1d0b03'],
    text: '#ffe4c6',
    accent: '#ffb878',
  },
  {
    metal: ['#ffffff', '#b3bdc8', '#47505b'],
    core: ['#323b46', '#11161c'],
    text: '#ffffff',
    accent: '#e8eef5',
  },
  {
    metal: ['#fff8cf', '#f2bb2b', '#7a4f02'],
    core: ['#553600', '#1f1400'],
    text: '#fff1bd',
    accent: '#ffe27a',
    gem: '#ff9d2e',
    rays: '#ffcf40',
  },
  {
    metal: ['#ffe9a3', '#d9a21f', '#5b3a00'],
    core: ['#9e0f24', '#3a020a'],
    text: '#ffe9b0',
    accent: '#ff5a6e',
    gem: '#ff2e4c',
    rays: '#ff4d64',
  },
  {
    metal: ['#ffeaa8', '#cf9b1c', '#4d3200'],
    core: ['#2a0f3d', '#07020d'],
    text: '#ffd86b',
    accent: '#c56bff',
    gem: '#b44dff',
    rays: '#a43dff',
  },
];

const SHIELD = 'M50 16 L75 23 L75 52 C75 67.5 63.5 78.5 50 87 C36.5 78.5 25 67.5 25 52 L25 23 Z';
const INNER = 'M50 22.5 L69 28 L69 52 C69 63.5 60.5 72 50 79 C39.5 72 31 63.5 31 52 L31 28 Z';
const LEFT_HALF = 'M50 16 L25 23 L25 52 C25 67.5 36.5 78.5 50 87 Z';
const RIVETS = [
  [28, 26],
  [72, 26],
  [27, 50],
  [73, 50],
  [38, 72],
  [62, 72],
] as const;

const rad = (deg: number) => (deg * Math.PI) / 180;
const f = (n: number) => n.toFixed(2);

function Sparkle({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  const q = s * 0.18;
  return (
    <path
      d={`M${x} ${y - s} Q${x + q} ${y - q} ${x + s} ${y} Q${x + q} ${y + q} ${x} ${y + s} Q${x - q} ${y + q} ${x - s} ${y} Q${x - q} ${y - q} ${x} ${y - s}Z`}
      fill={color}
    />
  );
}

/** Layered wing: `rows` feathers fanning out from one shoulder of the shield. */
function Wing({ side, rows, fill, line }: { side: -1 | 1; rows: number; fill: string; line: string }) {
  const feathers: ReactNode[] = [];
  for (let k = rows - 1; k >= 0; k--) {
    const len = 30 - k * 4.5;
    const ang = rad(-32 + k * 17);
    const ox = 50 + side * 22;
    const oy = 34 + k * 7;
    const tx = ox + side * len * Math.cos(ang);
    const ty = oy + len * Math.sin(ang);
    const w = 5.2 - k * 0.5;
    const nx = -Math.sin(ang) * w;
    const ny = Math.cos(ang) * w;
    feathers.push(
      <g key={k}>
        <path
          d={`M${f(ox)} ${f(oy - w * 0.6)} Q${f((ox + tx) / 2 + side * nx)} ${f((oy + ty) / 2 - ny)} ${f(tx)} ${f(ty)} Q${f((ox + tx) / 2 - side * nx * 0.3)} ${f((oy + ty) / 2 + ny * 0.9)} ${f(ox)} ${f(oy + w)}Z`}
          fill={fill}
          stroke={line}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        <path
          d={`M${f(ox)} ${f(oy + w * 0.2)} L${f(tx - side * 1.5)} ${f(ty)}`}
          stroke={line}
          strokeWidth={0.6}
          opacity={0.55}
        />
      </g>,
    );
  }
  return <>{feathers}</>;
}

interface BenchBadgeProps {
  kg: number;
  unlocked: boolean;
  size?: number;
}

export function BenchBadge({ kg, unlocked, size = 96 }: BenchBadgeProps) {
  const uid = useId();
  const label = `Badge bench ${kg} kg, ${benchRankLabel(kg)}, ${unlocked ? 'débloqué' : 'à débloquer'}`;
  const numeralSize = String(kg).length > 2 ? 16.5 : 19.5;

  if (!unlocked) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={label}
        className="overflow-visible"
      >
        <path d={SHIELD} className="fill-surface-2" />
        <path
          d={INNER}
          fill="none"
          className="stroke-muted"
          strokeWidth={1.3}
          strokeDasharray="3 3"
          opacity={0.6}
        />
        <text
          x="50"
          y="55.5"
          textAnchor="middle"
          className="fill-muted"
          style={{ font: `900 ${numeralSize}px Archivo, sans-serif`, fontStretch: '125%' }}
        >
          {kg}
        </text>
        <path
          d="M46 63 h8 v6 h-8z M47.5 63 v-2 a2.5 2.5 0 0 1 5 0 v2"
          fill="none"
          className="stroke-muted"
          strokeWidth={1.3}
        />
      </svg>
    );
  }

  const { tier, division } = benchRank(kg);
  const p = PALETTES[tier] ?? PALETTES[0];
  if (!p) return null;
  const [hi, mid, lo] = p.metal;
  const goldI = tier === 2 && division === 1;
  const id = (name: string) => `${uid}-${name}`;
  const metal = `url(#${id('m')})`;
  const dark = `url(#${id('d')})`;
  const wingRows = tier >= 4 ? 5 : tier === 3 ? 4 : tier === 2 ? (goldI ? 2 : 3) : 0;
  const withRays = p.rays !== undefined && !goldI;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={id('m')} x1="0" y1="0" x2=".7" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset=".42" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <linearGradient id={id('d')} x1="1" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <linearGradient id={id('e')} x1="0" y1="1" x2=".5" y2="0">
          <stop offset="0" stopColor={hi} />
          <stop offset=".5" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <radialGradient id={id('c')} cx=".5" cy=".3" r=".8">
          <stop offset="0" stopColor={p.core[0]} />
          <stop offset="1" stopColor={p.core[1]} />
        </radialGradient>
        {p.rays && (
          <radialGradient id={id('h')}>
            <stop offset="0" stopColor={p.rays} stopOpacity=".6" />
            <stop offset="1" stopColor={p.rays} stopOpacity="0" />
          </radialGradient>
        )}
        <radialGradient id={id('f')}>
          <stop offset=".55" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={id('o')}>
          <circle cx="50" cy="50" r="48" fill={`url(#${id('f')})`} />
        </mask>
        <clipPath id={id('k')}>
          <path d={INNER} />
        </clipPath>
      </defs>

      {/* Halo and rays behind the precious tiers (Or I keeps only the halo). */}
      {p.rays && <circle cx="50" cy="50" r={withRays ? 48 : 44} fill={`url(#${id('h')})`} />}
      {withRays && (
        <g opacity={tier >= 3 ? 0.45 : 0.3} mask={`url(#${id('o')})`} fill={p.rays}>
          {Array.from({ length: 16 }, (_, k) => {
            const a = k * 22.5;
            return (
              <path
                key={k}
                d={`M50 50 L${f(50 + 48 * Math.cos(rad(a - 2.6)))} ${f(50 + 48 * Math.sin(rad(a - 2.6)))} L${f(50 + 48 * Math.cos(rad(a + 2.6)))} ${f(50 + 48 * Math.sin(rad(a + 2.6)))}Z`}
              />
            );
          })}
        </g>
      )}

      {wingRows > 0 && (
        <>
          <Wing side={-1} rows={wingRows} fill={metal} line={lo} />
          <Wing side={1} rows={wingRows} fill={metal} line={lo} />
        </>
      )}
      {tier === 1 && (
        <>
          <path
            d="M26 30 L9 38 L21 44 L11 54 L26 57 Z"
            fill={metal}
            stroke={lo}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <path
            d="M74 30 L91 38 L79 44 L89 54 L74 57 Z"
            fill={dark}
            stroke={lo}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Faceted shield: light left half, dark right half, rivets on the rim. */}
      <path d={SHIELD} fill={dark} />
      <path d={LEFT_HALF} fill={metal} />
      <path d={SHIELD} fill="none" stroke={lo} strokeWidth={1.1} strokeLinejoin="round" />
      {RIVETS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.25} fill={hi} stroke={lo} strokeWidth={0.5} />
      ))}
      <path d={INNER} fill={`url(#${id('c')})`} />
      <g clipPath={`url(#${id('k')})`}>
        <path d="M31 28 L50 22.5 L69 28 L69 36 C57 32.5 43 32.5 31 36 Z" fill="#fff" opacity={0.12} />
      </g>
      <path d={INNER} fill="none" stroke={`url(#${id('e')})`} strokeWidth={1.5} />

      {tier >= 3 && p.gem && (
        <>
          <path
            d="M33 17 L36 4 L42.5 11 L50 1 L57.5 11 L64 4 L67 17 Z"
            fill={metal}
            stroke={lo}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <path d="M33 17 L67 17 L66 20 L34 20Z" fill={dark} stroke={lo} strokeWidth={0.7} />
          <circle cx="50" cy="8" r={2.6} fill={p.gem} stroke={lo} strokeWidth={0.5} />
          <circle cx="38.5" cy="12" r={1.5} fill={p.gem} />
          <circle cx="61.5" cy="12" r={1.5} fill={p.gem} />
        </>
      )}
      {tier === 2 &&
        (goldI ? (
          <path d="M44 18 L50 11 L56 18 Z" fill={metal} stroke={lo} strokeWidth={0.9} />
        ) : (
          <>
            <path
              d="M38 18 L44 12 L50 5 L56 12 L62 18 Z"
              fill={metal}
              stroke={lo}
              strokeWidth={0.9}
              strokeLinejoin="round"
            />
            <circle cx="50" cy="12.5" r={2.2} fill={p.gem} stroke={lo} strokeWidth={0.5} />
          </>
        ))}

      {/* Engraved barbell, the load and its divisions. */}
      <g fill={p.accent} opacity={0.9}>
        <rect x="41" y="32.4" width="18" height="1.6" />
        <rect x="42.5" y="29.8" width="2" height="6.8" />
        <rect x="55.5" y="29.8" width="2" height="6.8" />
        <rect x="40" y="31" width="1.6" height="4.4" />
        <rect x="58.4" y="31" width="1.6" height="4.4" />
      </g>
      <text
        x="50"
        y="56.5"
        textAnchor="middle"
        fill="#000"
        opacity={0.45}
        style={{ font: `900 ${numeralSize}px Archivo, sans-serif`, fontStretch: '125%' }}
      >
        {kg}
      </text>
      <text
        x="50"
        y="55.5"
        textAnchor="middle"
        fill={p.text}
        style={{ font: `900 ${numeralSize}px Archivo, sans-serif`, fontStretch: '125%' }}
      >
        {kg}
      </text>
      <text
        x="50"
        y="62.8"
        textAnchor="middle"
        fill={p.text}
        opacity={0.75}
        style={{ font: '800 5.6px Archivo, sans-serif', letterSpacing: '0.26em' }}
      >
        KG
      </text>
      {Array.from({ length: division }, (_, k) => (
        <path
          key={k}
          d={`M42 ${66 + k * 4.4} L50 ${70 + k * 4.4} L58 ${66 + k * 4.4}`}
          fill="none"
          stroke={p.accent}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {tier >= 3 && p.gem && (
        <>
          <path d="M50 83 L56 89.5 L50 98 L44 89.5 Z" fill={p.gem} stroke={lo} strokeWidth={0.8} />
          <path d="M50 83 L56 89.5 L50 90.5 Z" fill="#fff" opacity={0.45} />
        </>
      )}

      <Sparkle x={30} y={30} s={tier >= 2 ? 3.2 : 2.4} color="#fff" />
      {tier >= 2 && <Sparkle x={72} y={66} s={2.4} color="#fff" />}
      {(tier >= 3 || (tier === 2 && !goldI)) && (
        <>
          <Sparkle x={14} y={22} s={2.6} color={p.accent} />
          <Sparkle x={86} y={24} s={2.2} color={p.accent} />
        </>
      )}
    </svg>
  );
}

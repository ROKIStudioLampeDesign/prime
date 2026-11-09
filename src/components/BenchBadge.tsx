import { useId, type ReactNode } from 'react';
import { benchRank, benchRankLabel } from '../domain/streaks';

/**
 * A bench milestone drawn as an original ranked-game emblem, the "orbe couronné": a glossy orb
 * with an engraved barbell, set in a spiked ring, over a banner with the load. Each rank adds
 * ornaments: Bronze plain, Argent side blades, Or wings and a golden aura (rays on Or II), Rubis a
 * crown, Diamant (the 130 kg goal) a jewelled crown, facets and an icy halo, Obsidienne dark wings
 * and violet flames. The spikes grow with the rank; diamonds under the banner mark divisions.
 * Locked: a grey emblem with a padlock.
 */
interface Palette {
  /** Metal of the ring, spikes, wings and banner: light, mid, dark, outline. */
  frame: readonly [string, string, string, string];
  /** The orb: light, mid, dark. */
  gem: readonly [string, string, string];
  glow?: string;
  /** Engraving and banner text. */
  ink: string;
}

const GOLD = ['#fff3b0', '#e6b12a', '#7a4d00', '#2e1d00'] as const;
const PALETTES: readonly Palette[] = [
  {
    frame: ['#ffd4a8', '#b8733a', '#5a2c0e', '#241005'],
    gem: ['#f0b078', '#94511f', '#3a1806'],
    ink: '#ffe2c4',
  },
  {
    frame: ['#ffffff', '#c2ccd5', '#56606b', '#1c2127'],
    gem: ['#eef5ff', '#8ea3bd', '#26344a'],
    ink: '#ffffff',
  },
  { frame: GOLD, gem: ['#fff3b0', '#f2a900', '#6b3e00'], glow: '#ffc93a', ink: '#fff3c4' },
  { frame: GOLD, gem: ['#ffa3b4', '#e0103a', '#4f0012'], glow: '#ff3355', ink: '#fff0c8' },
  {
    frame: ['#ffffff', '#d4e6f0', '#5f7d90', '#15232c'],
    gem: ['#ffffff', '#8fe0ff', '#145f96'],
    glow: '#6fd6ff',
    ink: '#ffffff',
  },
  {
    frame: ['#ffe39a', '#c48f17', '#4a2e00', '#160c00'],
    gem: ['#d6b0ff', '#5a1fa0', '#0e021a'],
    glow: '#a24dff',
    ink: '#ffe08a',
  },
];

const CX = 50;
const CY = 45;
const BANNER_Y = 80;
const rad = (deg: number) => (deg * Math.PI) / 180;
const f = (n: number) => n.toFixed(2);
const pol = (r: number, deg: number, cx = CX, cy = CY) =>
  [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))] as const;

function Sparkle({
  x,
  y,
  s,
  color,
  opacity = 1,
}: {
  x: number;
  y: number;
  s: number;
  color: string;
  opacity?: number;
}) {
  const q = s * 0.16;
  return (
    <path
      opacity={opacity}
      fill={color}
      d={`M${x} ${y - s}Q${x + q} ${y - q} ${x + s} ${y}Q${x + q} ${y + q} ${x} ${y + s}Q${x - q} ${y + q} ${x - s} ${y}Q${x - q} ${y - q} ${x} ${y - s}Z`}
    />
  );
}

/** Rays (from Or II) and Obsidienne's flames behind the emblem; the halo is drawn by the caller. */
function Rays({
  tier,
  division,
  glow,
  mask,
}: {
  tier: number;
  division: number;
  glow: string;
  mask: string;
}) {
  const out: ReactNode[] = [];
  if (tier >= 3 || (tier === 2 && division === 2)) {
    const n = tier >= 4 ? 24 : 16;
    out.push(
      <g key="rays" mask={mask} fill={glow} opacity={tier >= 4 ? 0.55 : 0.4}>
        {Array.from({ length: n }, (_, k) => {
          const a = (360 / n) * k - 90;
          const w = k % 2 ? 1.6 : 3;
          const [x1, y1] = pol(62, a - w, 50, 46);
          const [x2, y2] = pol(62, a + w, 50, 46);
          return <path key={k} d={`M50 46L${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}Z`} />;
        })}
      </g>,
    );
  }
  if (tier === 5) {
    for (let k = -3; k <= 3; k++) {
      const x = 50 + k * 8;
      const h = 30 - Math.abs(k) * 5;
      out.push(
        <path
          key={`flame${k}`}
          d={`M${x - 6} 44 Q${x - 5} ${f(30 - h * 0.3)} ${x + (k % 2 ? 2 : -2)} ${f(16 - h * 0.4)} Q${x + 6} ${f(30 - h * 0.2)} ${x + 6} 44Z`}
          fill={k % 2 ? '#c27bff' : '#7a2cff'}
          opacity={0.55}
        />,
      );
    }
  }
  return <>{out}</>;
}

/** Argent: swept side blades. Or and up: feathered wings, one more row per rank. */
function Wings({
  tier,
  division,
  p,
  light,
  dark,
}: {
  tier: number;
  division: number;
  p: Palette;
  light: string;
  dark: string;
}) {
  const outline = p.frame[3];
  if (tier === 0) return null;
  const spread = 18;
  const cy = 44;
  if (tier === 1) {
    return (
      <>
        {([-1, 1] as const).map((side) => {
          const x = CX + side * spread;
          return (
            <g key={side}>
              <path
                d={`M${x} ${cy - 12} L${x + side * 20} ${cy - 6} L${x + side * 9} ${cy} L${x + side * 17} ${cy + 8} L${x} ${cy + 10}Z`}
                fill={side < 0 ? light : dark}
                stroke={outline}
                strokeWidth={0.8}
                strokeLinejoin="round"
              />
              {division === 2 && (
                <path
                  d={`M${x} ${cy + 6} L${x + side * 13} ${cy + 14} L${x} ${cy + 17}Z`}
                  fill={dark}
                  stroke={outline}
                  strokeWidth={0.7}
                />
              )}
            </g>
          );
        })}
      </>
    );
  }
  const rows = ([0, 0, 3, 4, 5, 6][tier] ?? 6) + (tier === 2 && division === 2 ? 1 : 0);
  const feathers: ReactNode[] = [];
  for (const side of [-1, 1] as const) {
    for (let k = rows - 1; k >= 0; k--) {
      const len = 34 - k * (20 / rows);
      const ang = -38 + k * (78 / rows);
      const ox = CX + side * spread;
      const oy = cy - 6 + k * (22 / rows);
      const tx = ox + side * len * Math.cos(rad(ang));
      const ty = oy + len * Math.sin(rad(ang));
      const w = 6 - k * 0.5;
      const nx = -Math.sin(rad(ang)) * w;
      const ny = Math.cos(rad(ang)) * w;
      const fill = tier === 5 ? (k % 2 ? '#2a1240' : '#1a0a2c') : (k + (side > 0 ? 1 : 0)) % 2 ? dark : light;
      feathers.push(
        <path
          key={`${side}${k}`}
          d={`M${f(ox)} ${f(oy - w * 0.5)} Q${f((ox + tx) / 2 + side * nx)} ${f((oy + ty) / 2 - ny)} ${f(tx)} ${f(ty)} Q${f((ox + tx) / 2 - side * nx * 0.2)} ${f((oy + ty) / 2 + ny)} ${f(ox)} ${f(oy + w)}Z`}
          fill={fill}
          stroke={tier === 5 ? '#b56bff' : outline}
          strokeWidth={tier === 5 ? 0.9 : 0.7}
          strokeLinejoin="round"
        />,
      );
    }
  }
  return <>{feathers}</>;
}

/** Rubis: crown. Diamant: taller, jewelled. Obsidienne: spiked horns. */
function Crown({ tier, p, light, dark }: { tier: number; p: Palette; light: string; dark: string }) {
  const outline = p.frame[3];
  const y = 18;
  if (tier < 3) return null;
  if (tier === 5) {
    return (
      <>
        <path
          d={`M34 ${y + 4} L28 ${y - 14} L40 ${y - 2} L44 ${y - 10} L50 ${y - 18} L56 ${y - 10} L60 ${y - 2} L72 ${y - 14} L66 ${y + 4}Z`}
          fill={light}
          stroke={outline}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        <circle cx="50" cy={y - 6} r={2.6} fill="#c98bff" stroke={outline} strokeWidth={0.5} />
      </>
    );
  }
  const tall = tier === 4 ? 4 : 0;
  const gem = p.gem[1];
  return (
    <>
      <path
        d={`M35 ${y + 4} L33 ${y - 9 - tall} L41.5 ${y - 3} L50 ${y - 14 - tall} L58.5 ${y - 3} L67 ${y - 9 - tall} L65 ${y + 4}Z`}
        fill={light}
        stroke={outline}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <rect x="35" y={y + 1} width="30" height="3.4" fill={dark} stroke={outline} strokeWidth={0.5} />
      <circle cx="50" cy={y - 7 - tall} r={2.4} fill={gem} stroke={outline} strokeWidth={0.5} />
      {tier === 4 && (
        <>
          <circle cx="38" cy={y - 2} r={1.5} fill={gem} />
          <circle cx="62" cy={y - 2} r={1.5} fill={gem} />
        </>
      )}
    </>
  );
}

/** The banner with the load, its ends folded behind. */
function Banner({
  kg,
  light,
  mid,
  dark,
  outline,
  ink,
}: {
  kg: number;
  light: string;
  mid: string;
  dark: string;
  outline: string;
  ink: string;
}) {
  const y = BANNER_Y;
  return (
    <>
      <path
        d={`M22 ${y} L18 ${y + 5.5} L22 ${y + 11} L30 ${y + 11} L30 ${y}Z`}
        fill={dark}
        stroke={outline}
        strokeWidth={0.6}
      />
      <path
        d={`M78 ${y} L82 ${y + 5.5} L78 ${y + 11} L70 ${y + 11} L70 ${y}Z`}
        fill={dark}
        stroke={outline}
        strokeWidth={0.6}
      />
      <path
        d={`M27 ${y - 2} L73 ${y - 2} L73 ${y + 9} L27 ${y + 9}Z`}
        fill={light}
        stroke={outline}
        strokeWidth={0.7}
      />
      <path d={`M28 ${y - 1} L72 ${y - 1} L72 ${y + 8} L28 ${y + 8}Z`} fill={mid} opacity={0.82} />
      <text
        x="50"
        y={y + 5.9}
        textAnchor="middle"
        fill={ink}
        style={{ font: '900 7.4px Archivo, sans-serif', fontStretch: '118%' }}
      >
        {kg} kg
      </text>
    </>
  );
}

/** Division diamonds under the banner (I, II, III). */
function Pips({ count, fill, outline }: { count: number; fill: string; outline: string }) {
  const y = BANNER_Y;
  const xs = Array.from({ length: count }, (_, k) => 50 + (k - (count - 1) / 2) * 10);
  return (
    <>
      {xs.map((x) => (
        <g key={x}>
          <path
            d={`M${x} ${y + 10} L${x + 4} ${y + 14} L${x} ${y + 18} L${x - 4} ${y + 14}Z`}
            fill={fill}
            stroke={outline}
            strokeWidth={0.7}
          />
          <path d={`M${x} ${y + 10} L${x + 4} ${y + 14} L${x} ${y + 14.6}Z`} fill="#fff" opacity={0.5} />
        </g>
      ))}
    </>
  );
}

/** Spiked ring: more and longer spikes at each rank. */
function spikes(tier: number, division: number): { d: string; dark: boolean }[] {
  const n = 8 + tier * 2 + (division === 2 ? 2 : 0);
  const len = 4 + tier * 1.4;
  const half = 360 / n / 2.6;
  return Array.from({ length: n }, (_, k) => {
    const a = (360 / n) * k - 90;
    const [x1, y1] = pol(24, a - half);
    const [x2, y2] = pol(24 + len, a);
    const [x3, y3] = pol(24, a + half);
    return { d: `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}Z`, dark: k % 2 === 1 };
  });
}

interface BenchBadgeProps {
  kg: number;
  unlocked: boolean;
  size?: number;
}

export function BenchBadge({ kg, unlocked, size = 96 }: BenchBadgeProps) {
  const uid = useId();
  const label = `Badge bench ${kg} kg, ${benchRankLabel(kg)}, ${unlocked ? 'débloqué' : 'à débloquer'}`;
  const { tier, division } = benchRank(kg);

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
        {spikes(tier, division).map((s, k) => (
          <path key={k} d={s.d} className="fill-surface-2" />
        ))}
        <circle cx={CX} cy={CY} r={25} className="fill-surface-2" />
        <circle
          cx={CX}
          cy={CY}
          r={18.5}
          fill="none"
          className="stroke-muted"
          strokeWidth={1.3}
          strokeDasharray="3 3"
          opacity={0.6}
        />
        <path
          d={`M44.5 ${CY - 1} h11 v9 h-11z M46.5 ${CY - 1} v-3 a3.5 3.5 0 0 1 7 0 v3`}
          fill="none"
          className="stroke-muted"
          strokeWidth={1.5}
        />
        <path
          d={`M27 ${BANNER_Y - 2} L73 ${BANNER_Y - 2} L73 ${BANNER_Y + 9} L27 ${BANNER_Y + 9}Z`}
          className="fill-surface-2"
        />
        <text
          x="50"
          y={BANNER_Y + 5.9}
          textAnchor="middle"
          className="fill-muted"
          style={{ font: '900 7.4px Archivo, sans-serif', fontStretch: '118%' }}
        >
          {kg} kg
        </text>
      </svg>
    );
  }

  const p = PALETTES[tier] ?? PALETTES[0];
  if (!p) return null;
  const [hi, mid, lo, outline] = p.frame;
  const id = (name: string) => `${uid}-${name}`;
  const light = `url(#${id('m')})`;
  const dark = `url(#${id('d')})`;
  const glowFaint = tier === 2 && division === 1;

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
        <linearGradient id={id('m')} x1="0" y1="0" x2=".75" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset=".45" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <linearGradient id={id('d')} x1="1" y1="0" x2=".2" y2="1">
          <stop offset="0" stopColor={mid} />
          <stop offset="1" stopColor={outline} />
        </linearGradient>
        <radialGradient id={id('g')} cx=".4" cy=".3" r=".85">
          <stop offset="0" stopColor={p.gem[0]} />
          <stop offset=".5" stopColor={p.gem[1]} />
          <stop offset="1" stopColor={p.gem[2]} />
        </radialGradient>
        {p.glow && (
          <radialGradient id={id('h')}>
            <stop offset="0" stopColor={p.glow} stopOpacity=".75" />
            <stop offset=".45" stopColor={p.glow} stopOpacity=".25" />
            <stop offset="1" stopColor={p.glow} stopOpacity="0" />
          </radialGradient>
        )}
        <radialGradient id={id('f')}>
          <stop offset=".35" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={id('r')}>
          <circle cx="50" cy="46" r="58" fill={`url(#${id('f')})`} />
        </mask>
      </defs>

      {p.glow && (
        <>
          <circle cx="50" cy="46" r={44 + tier * 3} fill={`url(#${id('h')})`} opacity={glowFaint ? 0.6 : 1} />
          <Rays tier={tier} division={division} glow={p.glow} mask={`url(#${id('r')})`} />
        </>
      )}
      <Wings tier={tier} division={division} p={p} light={light} dark={dark} />

      {spikes(tier, division).map((s, k) => (
        <path
          key={k}
          d={s.d}
          fill={s.dark ? dark : light}
          stroke={outline}
          strokeWidth={0.55}
          strokeLinejoin="round"
        />
      ))}
      <circle cx={CX} cy={CY + 1.6} r={25} fill="#000" opacity={0.5} />
      <circle cx={CX} cy={CY} r={25} fill={light} stroke={outline} strokeWidth={0.9} />
      <circle cx={CX} cy={CY} r={21} fill={dark} />
      {Array.from({ length: 12 }, (_, k) => {
        const [x, y] = pol(23, k * 30);
        return <circle key={k} cx={f(x)} cy={f(y)} r={1.1} fill={hi} stroke={outline} strokeWidth={0.35} />;
      })}
      <circle cx={CX} cy={CY} r={18.5} fill={`url(#${id('g')})`} stroke={outline} strokeWidth={0.7} />
      {tier === 4 &&
        Array.from({ length: 8 }, (_, k) => {
          const [x1, y1] = pol(18.5, k * 45);
          const [x2, y2] = pol(18.5, k * 45 + 45);
          return (
            <path
              key={k}
              d={`M${CX} ${CY}L${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}Z`}
              fill={k % 2 ? '#fff' : '#0b4d7a'}
              opacity={k % 2 ? 0.25 : 0.18}
            />
          );
        })}
      {tier === 5 && (
        <>
          <path
            d="M37 48 Q44 34 56 40 Q64 46 58 54"
            stroke="#e1bfff"
            strokeWidth={1.6}
            fill="none"
            opacity={0.7}
          />
          <path d="M42 54 Q50 46 57 49" stroke="#ff9be0" strokeWidth={1} fill="none" opacity={0.6} />
        </>
      )}
      <ellipse
        cx={CX - 5}
        cy={CY - 8}
        rx={8}
        ry={4.5}
        fill="#fff"
        opacity={0.42}
        transform={`rotate(-25 ${CX - 5} ${CY - 8})`}
      />
      {/* Engraved barbell. */}
      <g fill={p.ink} opacity={0.9}>
        <rect x="41" y={CY + 3.4} width="18" height="1.5" />
        <rect x="42.4" y={CY + 0.8} width="2" height="6.7" />
        <rect x="55.6" y={CY + 0.8} width="2" height="6.7" />
      </g>

      <Crown tier={tier} p={p} light={light} dark={dark} />
      <Banner kg={kg} light={light} mid={outline} dark={lo} outline={outline} ink={p.ink} />
      <Pips count={division} fill={light} outline={outline} />

      <Sparkle x={39} y={32} s={tier >= 2 ? 3 : 2.2} color="#fff" opacity={0.95} />
      {tier >= 3 && p.glow && (
        <>
          <Sparkle x={66} y={60} s={2.4} color="#fff" opacity={0.9} />
          <Sparkle x={12} y={30} s={2.3} color={p.glow} />
          <Sparkle x={88} y={26} s={2} color={p.glow} />
        </>
      )}
    </svg>
  );
}

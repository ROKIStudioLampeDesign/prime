import { useId, type ReactNode } from 'react';
import { liftRank, liftRankLabel, TRACKED_LIFTS, type LiftId } from '../domain/lifts';

/**
 * A lift milestone drawn as an original ranked-game emblem, the "orbe couronné": a glossy orb
 * with the lift engraved (see LiftGlyph), set in a spiked ring, over a banner with the load. Each rank adds
 * ornaments: Bronze plain, Argent side blades, Or wings and a golden aura (rays on Or II), Rubis a
 * crown, Diamant a jewelled crown, facets and an icy halo, Obsidienne dark wings
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

type Pt = readonly [number, number];

interface Figure {
  head: Pt;
  shoulder: Pt;
  hip: Pt;
  /** Shoulder → elbow → hand. */
  arm: readonly [Pt, Pt];
  /** Hip → knee → ankle → toe, near leg then far leg (drawn fainter, for depth). */
  leg: readonly [Pt, Pt, Pt];
  farLeg: readonly [Pt, Pt, Pt];
  /** Bar end seen from the side, and its plate's radius. */
  disc: Pt;
  discR: number;
  /** Bench pad and legs (bench press only). */
  bench?: boolean;
}

/**
 * Side-view pictograms facing right, in each lift's telling position, drawn in the orb (centre
 * 50,45, radius 18.5) above a floor line at y 58.6.
 */
const FIGURES: Record<LiftId, Figure> = {
  // Lying on the bench, arms locked, bar over the shoulders, feet planted.
  bench: {
    head: [37.4, 46.6],
    shoulder: [42.4, 48.2],
    hip: [52.4, 48.4],
    arm: [
      [42.9, 43.2],
      [43.3, 38.6],
    ],
    leg: [
      [58.2, 45.8],
      [59.8, 56.6],
      [62.6, 57.2],
    ],
    farLeg: [
      [57, 46.4],
      [56.8, 56.6],
      [59.4, 57.2],
    ],
    disc: [43.4, 35],
    discR: 5,
    bench: true,
  },
  // Bottom of a back squat: hips below the knees, bar on the traps, chest up.
  squat: {
    head: [55.4, 33.2],
    shoulder: [51.4, 37.6],
    hip: [44.2, 47.6],
    arm: [
      [56, 40.8],
      [52.8, 36],
    ],
    leg: [
      [56.6, 46.2],
      [53.2, 56.6],
      [57.8, 57.2],
    ],
    farLeg: [
      [55.2, 47.2],
      [51.6, 56.6],
      [56.2, 57.2],
    ],
    disc: [50, 35],
    discR: 5,
  },
  // Off the floor: back flat, shoulders over the bar, arms long, plates on the floor.
  deadlift: {
    head: [58.8, 34.2],
    shoulder: [54.4, 37.8],
    hip: [42.4, 42.2],
    arm: [
      [54.6, 44],
      [54.8, 49.6],
    ],
    leg: [
      [51.4, 47],
      [47.8, 56.6],
      [52.2, 57.2],
    ],
    farLeg: [
      [50, 48],
      [46.2, 56.6],
      [50.6, 57.2],
    ],
    disc: [54.8, 53.2],
    discR: 5.3,
  },
  // The catch: bar racked on the shoulders, elbows high, knees soft.
  'power-clean': {
    head: [52, 31.2],
    shoulder: [50.4, 36.6],
    hip: [47.2, 47],
    arm: [
      [57.8, 39.6],
      [55, 37.4],
    ],
    leg: [
      [54.6, 50.4],
      [51.4, 56.6],
      [55.8, 57.2],
    ],
    farLeg: [
      [53.2, 51.2],
      [49.8, 56.6],
      [54.2, 57.2],
    ],
    disc: [55.8, 35.8],
    discR: 4.7,
  },
  // Receiving the snatch: overhead squat, arms locked over the heels.
  snatch: {
    head: [52.4, 38.6],
    shoulder: [48.6, 41.4],
    hip: [44.6, 49.8],
    arm: [
      [48.3, 37.6],
      [48.1, 34.6],
    ],
    leg: [
      [55.6, 49.6],
      [52.4, 56.6],
      [56.8, 57.2],
    ],
    farLeg: [
      [54.2, 50.4],
      [50.8, 56.6],
      [55, 57.2],
    ],
    disc: [48, 30.8],
    discR: 4.4,
  },
};

/** A tapered segment from a (width wa) to b (width wb), with round ends. */
function Bone({ a, b, wa, wb, color }: { a: Pt; b: Pt; wa: number; wb: number; color: string }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / len;
  const ny = (b[0] - a[0]) / len;
  const d = [
    [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
    [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
    [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2],
    [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2],
  ]
    .map(([x, y], k) => `${k ? 'L' : 'M'}${f(x ?? 0)} ${f(y ?? 0)}`)
    .join('');
  return (
    <>
      <path d={`${d}Z`} fill={color} />
      <circle cx={a[0]} cy={a[1]} r={wa / 2} fill={color} />
      <circle cx={b[0]} cy={b[1]} r={wb / 2} fill={color} />
    </>
  );
}

function Leg({ hip, leg, color }: { hip: Pt; leg: readonly [Pt, Pt, Pt]; color: string }) {
  const [knee, ankle, toe] = leg;
  return (
    <>
      <Bone a={hip} b={knee} wa={3.6} wb={2.6} color={color} />
      <Bone a={knee} b={ankle} wa={2.5} wb={1.7} color={color} />
      <Bone a={ankle} b={toe} wa={1.8} wb={1.3} color={color} />
    </>
  );
}

/** One pass of the pictogram in a single colour; `hole` cuts the plate's ring and hub. */
function FigureShape({ fig, color, hole }: { fig: Figure; color: string; hole: string }) {
  const [elbow, hand] = fig.arm;
  const [dx, dy] = fig.disc;
  return (
    <g>
      <line x1={38.8} y1={58.6} x2={61.2} y2={58.6} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      {fig.bench && (
        <>
          <rect x={36.6} y={51} width={20} height={2.6} rx={0.6} fill={color} />
          <rect x={39.6} y={53} width={1.5} height={5.6} fill={color} />
          <rect x={52.6} y={53} width={1.5} height={5.6} fill={color} />
        </>
      )}
      <g opacity={0.55}>
        <Leg hip={fig.hip} leg={fig.farLeg} color={color} />
      </g>
      <Leg hip={fig.hip} leg={fig.leg} color={color} />
      <Bone a={fig.hip} b={fig.shoulder} wa={4} wb={4.8} color={color} />
      <Bone a={fig.shoulder} b={elbow} wa={2.6} wb={2.1} color={color} />
      <Bone a={elbow} b={hand} wa={2} wb={1.7} color={color} />
      <circle cx={fig.head[0]} cy={fig.head[1]} r={2.9} fill={color} />
      {/* Plate seen end on: face, a raised ring, the bar's end. */}
      <circle cx={dx} cy={dy} r={fig.discR} fill={color} />
      <circle cx={dx} cy={dy} r={fig.discR * 0.68} fill="none" stroke={hole} strokeWidth={0.6} />
      <circle cx={dx} cy={dy} r={fig.discR * 0.24} fill={hole} />
    </g>
  );
}

/**
 * The lift engraved in the orb: a dark pictogram cut into the gem, with a light lower edge so it
 * reads as carved on every rank's colour.
 */
function LiftGlyph({ lift, ink, dark }: { lift: LiftId; ink: string; dark: string }) {
  const fig = FIGURES[lift];
  return (
    <g>
      <g transform="translate(0.45 0.65)" opacity={0.75}>
        <FigureShape fig={fig} color={ink} hole={ink} />
      </g>
      <g opacity={0.9}>
        <FigureShape fig={fig} color={dark} hole={ink} />
      </g>
    </g>
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

interface LiftBadgeProps {
  lift: LiftId;
  kg: number;
  unlocked: boolean;
  size?: number;
}

export function LiftBadge({ lift, kg, unlocked, size = 96 }: LiftBadgeProps) {
  const scale = TRACKED_LIFTS[lift];
  const uid = useId();
  const label = `Badge ${scale.label.toLowerCase()} ${kg} kg, ${liftRankLabel(scale, kg)}, ${unlocked ? 'débloqué' : 'à débloquer'}`;
  const { tier, division } = liftRank(scale, kg);

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
      <LiftGlyph lift={lift} ink={p.ink} dark={p.gem[2]} />

      <Crown tier={tier} p={p} light={light} dark={dark} />
      <Banner kg={kg} light={light} mid={outline} dark={lo} outline={outline} ink={p.ink} />
      <Pips count={division} fill={light} outline={outline} />

      <Sparkle x={35.6} y={34.4} s={tier >= 2 ? 2.8 : 2.2} color="#fff" opacity={0.95} />
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

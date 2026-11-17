import { accentIndexForSlot, nextAccentChange } from '../domain/accentRotation';

/**
 * The colours the app rotates through. A palette only overrides the raw accent variables of
 * `src/index.css` (see `--a` there); every token, gradient and glow follows.
 */
export interface AccentPalette {
  id: string;
  /** French name, shown in Réglages. */
  label: string;
  /** The bright colour itself, for swatches and the countdown line. */
  color: string;
  vars: Record<string, string>;
}

/**
 * On a red or orange palette the usual red signals would vanish: warnings and "jours rouges"
 * turn yellow instead.
 */
const YELLOW_SIGNALS = { 'd-main': '#f4e04d', 'd-dark': '#7a6f00', rd: '#f4e04d', 'on-rd': '#020106' };

interface Shades {
  /** RGB channels of the colour. */
  channels: string;
  light: string;
  dark: string;
  /** Pale shade that starts gradient text. */
  pale: string;
  /** Text colour on the white page (light theme). */
  text: string;
  /** Salle band: the colour in the shade. */
  band: string;
  /** RGB channels of the light falling on the Salle band (dark enough for white text). */
  bandLight: string;
  /** Chart strokes for Salle on the black page. */
  tint: string;
  /** Red or orange: use the yellow signals. */
  warm?: boolean;
}

function palette(id: string, label: string, color: string, shades: Shades): AccentPalette {
  return {
    id,
    label,
    color,
    vars: {
      a: shades.channels,
      'a-main': color,
      'a-hi': shades.light,
      'a-lo': shades.dark,
      'a-text-hi': shades.pale,
      'a-dark': shades.text,
      'g-main': shades.band,
      gl: shades.bandLight,
      'g-tint': shades.tint,
      'g-dark': shades.band,
      ...(shades.warm ? YELLOW_SIGNALS : {}),
    },
  };
}

/** The Salle band of a two-colour palette: a second colour instead of the accent in the shade. */
interface Band {
  band: string;
  /** RGB channels of the band's light, also the second ambient light of the page. */
  light: string;
  tint: string;
}

const VIOLET_BAND: Band = { band: '#3d1a8a', light: '165 107 255', tint: '#cdb0ff' };
const NIGHT_BAND: Band = { band: '#1b2a8f', light: '70 100 255', tint: '#8fa2ff' };
const BLUE_BAND: Band = { band: '#12327d', light: '77 141 255', tint: '#a8c6ff' };
const PINK_BAND: Band = { band: '#7a1049', light: '255 46 138', tint: '#ff9bcb' };

function bandVars({ band, light, tint }: Band): Record<string, string> {
  return { 'g-main': band, gl: light, 'g-tint': tint, 'g-dark': band, amb2: light };
}

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** `hex` moved towards `other` by `share` (0 to 1). */
function mix(hex: string, other: string, share: number): string {
  const to = channels(other);
  const mixed = channels(hex).map((c, i) => Math.round(c + ((to[i] ?? c) - c) * share));
  return '#' + mixed.map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * A two-colour palette from three colours: the bright accent, the deep Salle band and that
 * band's light. Every other shade is derived.
 */
function harmony(
  id: string,
  label: string,
  color: string,
  band: string,
  light: string,
  warm = false,
): AccentPalette {
  return {
    id,
    label,
    color,
    vars: {
      a: channels(color).join(' '),
      'a-main': color,
      'a-hi': mix(color, '#ffffff', 0.55),
      'a-lo': mix(color, '#000000', 0.18),
      'a-text-hi': mix(color, '#ffffff', 0.72),
      'a-dark': mix(color, '#000000', 0.5),
      ...bandVars({ band, light: channels(light).join(' '), tint: mix(light, '#ffffff', 0.45) }),
      ...(warm ? YELLOW_SIGNALS : {}),
    },
  };
}

const SINGLE_PALETTES: AccentPalette[] = [
  // The stylesheet's defaults.
  { id: 'pink', label: 'Rose', color: '#ff2e8a', vars: {} },
  palette('lime', 'Lime acide', '#c6ff3d', {
    channels: '198 255 61',
    light: '#ecffb0',
    dark: '#8fd400',
    pale: '#f1ffc7',
    text: '#4f7500',
    band: '#3d5c00',
    bandLight: '110 160 0',
    tint: '#e0ff94',
  }),
  palette('orange', 'Orange feu', '#ff6a1f', {
    channels: '255 106 31',
    light: '#ffb98f',
    dark: '#d94700',
    pale: '#ffd6bd',
    text: '#b83c00',
    band: '#7a2a05',
    bandLight: '255 106 31',
    tint: '#ffb38a',
    warm: true,
  }),
  palette('cyan', 'Cyan électrique', '#2ee6ff', {
    channels: '46 230 255',
    light: '#b0f6ff',
    dark: '#00b4d4',
    pale: '#d1faff',
    text: '#007a94',
    band: '#06556b',
    bandLight: '0 150 180',
    tint: '#9ef2ff',
  }),
  palette('violet', 'Violet néon', '#a56bff', {
    channels: '165 107 255',
    light: '#d9c2ff',
    dark: '#7a35f0',
    pale: '#e6d6ff',
    text: '#6a2be0',
    band: '#3d1a8a',
    bandLight: '165 107 255',
    tint: '#cdb0ff',
  }),
  palette('gold', 'Or', '#ffc233', {
    channels: '255 194 51',
    light: '#ffe6a3',
    dark: '#e09a00',
    pale: '#fff0c7',
    text: '#8f6200',
    band: '#6b4700',
    bandLight: '190 130 0',
    tint: '#ffdd8a',
  }),
  palette('mint', 'Menthe', '#2effb0', {
    channels: '46 255 176',
    light: '#b8ffe3',
    dark: '#00cc84',
    pale: '#d4fff0',
    text: '#00754c',
    band: '#06573d',
    bandLight: '0 150 100',
    tint: '#9effd9',
  }),
  palette('turquoise', 'Turquoise', '#00d9c0', {
    channels: '0 217 192',
    light: '#a3f5ea',
    dark: '#00a894',
    pale: '#c9fbf4',
    text: '#00705f',
    band: '#064f47',
    bandLight: '0 140 124',
    tint: '#8ff0e4',
  }),
  palette('fuchsia', 'Fuchsia', '#e83dff', {
    channels: '232 61 255',
    light: '#f6b3ff',
    dark: '#b915d1',
    pale: '#fad1ff',
    text: '#9a0fb0',
    band: '#5c0f6b',
    bandLight: '232 61 255',
    tint: '#f0a3ff',
  }),
  palette('lemon', 'Citron', '#fff03d', {
    channels: '255 240 61',
    light: '#fffab8',
    dark: '#e0cc00',
    pale: '#fffcd6',
    text: '#7a6f00',
    band: '#5c5500',
    bandLight: '160 148 0',
    tint: '#fff694',
  }),
  palette('neon-green', 'Vert néon', '#3dff5a', {
    channels: '61 255 90',
    light: '#b8ffc2',
    dark: '#12d430',
    pale: '#d6ffdc',
    text: '#0a7a1c',
    band: '#0a5c18',
    bandLight: '20 150 40',
    tint: '#9effab',
  }),
];

/** A single-colour palette with another colour on the Salle band. */
function duo(id: string, label: string, accentId: string, band: Band): AccentPalette[] {
  const accent = SINGLE_PALETTES.find((p) => p.id === accentId);
  return accent ? [{ id, label, color: accent.color, vars: { ...accent.vars, ...bandVars(band) } }] : [];
}

export const ACCENT_PALETTES: AccentPalette[] = [
  // Citron is only the bright half of a duo, not a colour of its own in the rotation.
  ...SINGLE_PALETTES.filter((p) => p.id !== 'lemon'),
  {
    id: 'yellow-blue',
    label: 'Jaune et bleu',
    color: '#f4e04d',
    vars: {
      a: '244 224 77',
      'a-main': '#f4e04d',
      'a-hi': '#fbf3b0',
      'a-lo': '#d9bf1a',
      'a-text-hi': '#fdf8cf',
      'a-dark': '#1f33d6',
      ...bandVars({ band: '#2340ff', light: '70 100 255', tint: '#6b84ff' }),
      amb2: '35 64 255',
    },
  },
  ...duo('cyan-violet', 'Cyan et violet', 'cyan', VIOLET_BAND),
  ...duo('orange-violet', 'Orange et violet', 'orange', VIOLET_BAND),
  ...duo('lime-night', 'Lime et bleu nuit', 'lime', NIGHT_BAND),
  ...duo('mint-night', 'Menthe et bleu nuit', 'mint', NIGHT_BAND),
  ...duo('lemon-pink', 'Citron et rose', 'lemon', PINK_BAND),
  ...duo('fuchsia-blue', 'Fuchsia et bleu', 'fuchsia', BLUE_BAND),
  harmony('coral-teal', 'Corail et sarcelle', '#ff6b6b', '#0f5e58', '#4ecdc4', true),
  harmony('lime-mint', 'Lime et menthe', '#d4ff3f', '#0f5a45', '#94ffd8'),
  harmony('yellow-violet', 'Jaune et violet', '#ffd400', '#4a1fb8', '#8f6bff'),
  harmony('glacier-royal', 'Glacier et bleu roi', '#5ce1ff', '#0b3a8f', '#4d8dff'),
  harmony('sun-petrol', 'Soleil et bleu pétrole', '#ffd23f', '#0b5563', '#2bb5c9'),
  harmony('turquoise-plum', 'Turquoise et prune', '#19e3c4', '#5a1466', '#c64fe0'),
];

const FALLBACK: AccentPalette = { id: 'pink', label: 'Rose', color: '#ff2e8a', vars: {} };

/** The palette of a slot (see `accentSlot`). */
export function accentForSlot(slot: number): AccentPalette {
  return ACCENT_PALETTES[accentIndexForSlot(slot, ACCENT_PALETTES.length)] ?? FALLBACK;
}

/** Every variable a palette may set, so switching clears what the previous one left. */
const VAR_NAMES = [...new Set(ACCENT_PALETTES.flatMap((p) => Object.keys(p.vars)))];

function applyAccent(root: HTMLElement, accent: AccentPalette) {
  for (const name of VAR_NAMES) root.style.removeProperty(`--${name}`);
  for (const [name, value] of Object.entries(accent.vars)) root.style.setProperty(`--${name}`, value);
}

/** Where the next colour change starts from, when a tap on the letter caused it. */
let waveOrigin: { x: number; y: number } | undefined;

/** The next `showAccent` grows from this point (viewport px) instead of the bottom of the screen. */
export function startNextAccentWaveAt(x: number, y: number) {
  waveOrigin = { x, y };
}

let waves = 0;

/**
 * Switches the app to a palette. With `wave`, the new colours come in behind a ring of glass
 * tinted with the new accent (a view transition styled in `index.css`), growing from the letter
 * when a tap caused the change and from the bottom of the screen otherwise. Without it, or where
 * view transitions or motion are unavailable, the change is instant.
 */
export function showAccent(accent: AccentPalette, wave: boolean) {
  const root = document.documentElement;
  const origin = waveOrigin ?? { x: window.innerWidth / 2, y: window.innerHeight };
  waveOrigin = undefined;
  const reducedMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!wave || reducedMotion || typeof document.startViewTransition !== 'function') {
    applyAccent(root, accent);
    return;
  }
  root.style.setProperty('--wave-x', `${origin.x}px`);
  root.style.setProperty('--wave-y', `${origin.y}px`);
  root.classList.add('accent-wave');
  waves += 1;
  const id = waves;
  const transition = document.startViewTransition(() => applyAccent(root, accent));
  // While the wave runs, the page outside the ring is a frozen picture of the old one: a touch
  // would seem lost. Any touch ends the wave at once, so the page answers it.
  const skip = () => transition.skipTransition();
  window.addEventListener('pointerdown', skip, { capture: true, once: true });
  void transition.finished
    .catch(() => undefined)
    .then(() => {
      window.removeEventListener('pointerdown', skip, { capture: true });
      // A newer wave may have replaced this one: the class is then still in use.
      if (id === waves) root.classList.remove('accent-wave');
    });
}

/*
 * Tapping the letter or "Changer maintenant" (Réglages) skips time: the rotation runs on the real
 * clock plus this boost. It is kept in localStorage rather than IndexedDB because it must be read
 * before the first paint (a UI offset, not user data: it is in no backup).
 */
const BOOST_KEY = 'prime.accentBoostMs';

function storedBoost(): number {
  try {
    const value = Number(localStorage.getItem(BOOST_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    // No storage (private mode, tests outside a browser): start from the real clock.
    return 0;
  }
}

let boostMs = storedBoost();
const listeners = new Set<() => void>();

/** Milliseconds skipped so far. */
export const accentBoost = () => boostMs;

export function boostAccent(ms: number) {
  boostMs += ms;
  try {
    localStorage.setItem(BOOST_KEY, String(boostMs));
  } catch {
    // Not saved: the skip lasts until the app is reloaded.
  }
  for (const listener of listeners) listener();
}

/** Skips what is left of the current slot. */
export function skipAccent() {
  const now = Date.now() + boostMs;
  boostAccent(nextAccentChange(now) - now);
}

export function subscribeAccentBoost(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

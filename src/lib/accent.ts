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

export const ACCENT_PALETTES: AccentPalette[] = [
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
  palette('blue', 'Bleu électrique', '#4d8dff', {
    channels: '77 141 255',
    light: '#b8d2ff',
    dark: '#2f6ff0',
    pale: '#d6e5ff',
    text: '#1a4fc4',
    band: '#12327d',
    bandLight: '77 141 255',
    tint: '#a8c6ff',
  }),
  palette('red', 'Rouge braise', '#ff3b30', {
    channels: '255 59 48',
    light: '#ffa8a3',
    dark: '#d91a10',
    pale: '#ffd0cc',
    text: '#b3140c',
    band: '#6e0f0a',
    bandLight: '255 59 48',
    tint: '#ff9d97',
    warm: true,
  }),
  palette('coral', 'Corail', '#ff7a6b', {
    channels: '255 122 107',
    light: '#ffc4bc',
    dark: '#e8523f',
    pale: '#ffe0db',
    text: '#b83a29',
    band: '#70261c',
    bandLight: '220 90 75',
    tint: '#ffb8ae',
    warm: true,
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
  palette('silver', 'Argent', '#cfd6e0', {
    channels: '207 214 224',
    light: '#ffffff',
    dark: '#98a3b3',
    pale: '#ffffff',
    text: '#4a5565',
    band: '#2c3440',
    bandLight: '120 135 155',
    tint: '#e3e8ef',
  }),
  palette('blood', 'Rouge sang', '#d91a2a', {
    channels: '217 26 42',
    light: '#ff8a94',
    dark: '#b80d1c',
    pale: '#ffbcc2',
    text: '#9e0a17',
    band: '#4d060c',
    bandLight: '217 26 42',
    tint: '#ff8a94',
    warm: true,
  }),
];

const FALLBACK: AccentPalette = { id: 'pink', label: 'Rose', color: '#ff2e8a', vars: {} };

/** The palette of a half hour (see `accentSlot`). */
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

/** The next `showAccent` grows from this point (viewport px) instead of rising from the bottom. */
export function startNextAccentWaveAt(x: number, y: number) {
  waveOrigin = { x, y };
}

let waves = 0;

/**
 * Switches the app to a palette. With `wave`, the new colours come in behind a band of the new
 * accent (a view transition styled in `index.css`): a swell rising from the bottom, or a ring
 * growing from the letter when a tap caused the change. Without it, or where view transitions or
 * motion are unavailable, the change is instant.
 */
export function showAccent(accent: AccentPalette, wave: boolean) {
  const root = document.documentElement;
  const origin = waveOrigin;
  waveOrigin = undefined;
  const reducedMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!wave || reducedMotion || typeof document.startViewTransition !== 'function') {
    applyAccent(root, accent);
    return;
  }
  root.classList.remove('accent-wave', 'accent-wave-tap');
  if (origin) {
    root.style.setProperty('--wave-x', `${origin.x}px`);
    root.style.setProperty('--wave-y', `${origin.y}px`);
  }
  root.classList.add(origin ? 'accent-wave-tap' : 'accent-wave');
  waves += 1;
  const id = waves;
  const transition = document.startViewTransition(() => applyAccent(root, accent));
  void transition.finished
    .catch(() => undefined)
    .then(() => {
      // A newer wave may have replaced this one: its classes are not ours to remove.
      if (id === waves) root.classList.remove('accent-wave', 'accent-wave-tap');
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

/** Skips what is left of the current half hour. */
export function skipAccent() {
  const now = Date.now() + boostMs;
  boostAccent(nextAccentChange(now) - now);
}

export function subscribeAccentBoost(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

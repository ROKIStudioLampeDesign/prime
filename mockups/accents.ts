import { db } from '../src/db/db';
import { ACCENT_PALETTES, VAR_NAMES, harmony, type AccentPalette } from '../src/lib/accent';

/** Proposals not in the rotation yet: bright accent, deep Salle band, the band's light. */
const NEW: AccentPalette[] = [
  harmony('blood-ice', 'Rouge sang et glace', '#e8f4ff', '#8a0a1a', '#ff4d5e'),
  harmony('peach-burgundy', 'Pêche et bordeaux', '#ffab73', '#6b0f2a', '#e0466f', true),
  harmony('candy-emerald', 'Rose bonbon et émeraude', '#ff7ac6', '#0b5a3c', '#2ed39a'),
  harmony('sky-brick', 'Bleu ciel et brique', '#7cc8ff', '#8a1f12', '#ff6a4d'),
  harmony('sand-navy', 'Sable et bleu marine', '#ffe3a3', '#0e2a5c', '#4d7dff'),
  harmony('apple-wine', 'Vert pomme et vin', '#a8ff4a', '#5c0f33', '#e04d8f'),
  harmony('lavender-aubergine', 'Lavande et aubergine', '#c7a6ff', '#3b0f4f', '#b04de0'),
  harmony('copper-sage', 'Cuivre et sauge', '#ffb38a', '#2f4a3a', '#7fbf98', true),
];

interface Option {
  n: number;
  palette: AccentPalette;
  rotation: boolean;
}

const OPTIONS: Option[] = [
  ...NEW.map((palette) => ({ palette, rotation: false })),
  ...ACCENT_PALETTES.map((palette) => ({ palette, rotation: true })),
].map((o, i) => ({ ...o, n: i + 1 }));

const FILTERS = [
  { key: '', label: 'Tout', keep: () => true },
  { key: 'nouveaux', label: 'Nouveaux', keep: (o: Option) => !o.rotation },
  { key: 'rotation', label: 'En rotation', keep: (o: Option) => o.rotation },
  // Every palette here is a duo now; kept so old links still work.
  { key: 'duos', label: 'Duos', keep: () => true },
];
const SIZES = [
  { key: 's', label: 'Petit', scale: 0.5 },
  { key: 'm', label: 'Moyen', scale: 0.7 },
  { key: 'l', label: 'Grand', scale: 1 },
];

const params = new URLSearchParams(location.search);
const filter = FILTERS.find((f) => f.key && params.has(f.key)) ?? FILTERS[0];
let screen = params.get('ecran') ?? '/';
let size = SIZES.find((s) => s.key === params.get('taille')) ?? SIZES[0];

// An empty database (a fresh browser) gets the demo data, so the phones show something.
if ((await db.workouts.count()) === 0 && (await db.logEntries.count()) === 0) {
  const { loadDemoData, loadGymDemoData, loadBodyWeightDemoData } = await import('../src/db/demo');
  await loadDemoData();
  await loadGymDemoData();
  await loadBodyWeightDemoData();
}

const lastWorkout = await db.workouts.orderBy('startedAt').last();
const SCREENS = [
  { label: 'Accueil', path: '/' },
  { label: 'Alimentation', path: '/nutrition' },
  { label: 'Salle', path: '/gym' },
  { label: 'Séance', path: lastWorkout ? `/gym/workout/${lastWorkout.id}` : '' },
  { label: 'Stats', path: '/stats' },
];

function saveParams() {
  const out = new URLSearchParams(filter?.key ? { [filter.key]: '' } : {});
  if (screen !== '/') out.set('ecran', screen);
  if (size && size.key !== 's') out.set('taille', size.key);
  history.replaceState(null, '', `?${out.toString().replace(/=(&|$)/g, '$1')}`);
}

/** Keeps the frame on `palette`: the app's own rotation rewrites these variables on its root. */
function paint(frame: HTMLIFrameElement, palette: AccentPalette) {
  const root = frame.contentDocument?.documentElement;
  if (!root) return;
  const apply = () => {
    for (const name of VAR_NAMES) {
      const want = palette.vars[name] ?? '';
      if (root.style.getPropertyValue(`--${name}`) === want) continue;
      if (want) root.style.setProperty(`--${name}`, want);
      else root.style.removeProperty(`--${name}`);
    }
  };
  apply();
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['style'] });
}

const frames: HTMLIFrameElement[] = [];

function sizeFrame(phone: HTMLElement, frame: HTMLIFrameElement | undefined) {
  const scale = size?.scale ?? 0.5;
  phone.style.width = `${390 * scale}px`;
  phone.style.height = `${844 * scale}px`;
  if (frame) frame.style.transform = `scale(${scale})`;
}

// Frames load only near the screen: forty copies of the app at once are too heavy.
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const phone = entry.target as HTMLElement;
      observer.unobserve(phone);
      const option = OPTIONS.find((o) => String(o.n) === phone.dataset.n);
      if (!option) continue;
      const frame = document.createElement('iframe');
      frame.title = `${option.n}. ${option.palette.label}`;
      frame.addEventListener('load', () => paint(frame, option.palette));
      frame.src = screen;
      sizeFrame(phone, frame);
      phone.append(frame);
      frames.push(frame);
    }
  },
  { rootMargin: '300px' },
);

function swatch(color: string) {
  return `<span class="sw"><i style="background:${color}"></i>${color}</span>`;
}

const grid = document.getElementById('grid');
for (const option of OPTIONS.filter((o) => filter?.keep(o))) {
  const { palette } = option;
  const figure = document.createElement('figure');
  figure.innerHTML = `<figcaption><strong>${option.n}. ${palette.label}<span class="badge">${
    option.rotation ? 'en rotation' : 'nouveau'
  }</span></strong>${swatch(palette.color)}${swatch(palette.vars['g-main'] ?? '#7a1049')}</figcaption>`;
  const phone = document.createElement('div');
  phone.className = 'phone';
  phone.dataset.n = String(option.n);
  sizeFrame(phone, undefined);
  figure.append(phone);
  grid?.append(figure);
  observer.observe(phone);
}

function buttons(
  id: string,
  items: { label: string; on: boolean; disabled?: boolean; click?: () => void; href?: string }[],
) {
  const group = document.getElementById(id);
  if (!group) return;
  group.replaceChildren(
    ...items.map((item) => {
      const el = document.createElement(item.href ? 'a' : 'button');
      el.textContent = item.label;
      if (item.on) el.className = 'on';
      if (item.href && el instanceof HTMLAnchorElement) el.href = item.href;
      if (el instanceof HTMLButtonElement) el.disabled = item.disabled ?? false;
      if (item.click) el.addEventListener('click', item.click);
      return el;
    }),
  );
}

function render() {
  buttons(
    'filters',
    FILTERS.slice(0, 3).map((f) => ({ label: f.label, on: f === filter, href: f.key ? `?${f.key}` : '?' })),
  );
  buttons(
    'screens',
    SCREENS.map((s) => ({
      label: s.label,
      on: s.path === screen,
      disabled: !s.path,
      click: () => {
        screen = s.path;
        for (const frame of frames) frame.src = screen;
        saveParams();
        render();
      },
    })),
  );
  buttons(
    'sizes',
    SIZES.map((s) => ({
      label: s.label,
      on: s === size,
      click: () => {
        size = s;
        for (const phone of document.querySelectorAll<HTMLElement>('.phone'))
          sizeFrame(phone, phone.querySelector('iframe') ?? undefined);
        saveParams();
        render();
      },
    })),
  );
}
render();

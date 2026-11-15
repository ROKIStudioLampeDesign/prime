// Builds an exaggerated, ink-styled figure from the CC BY-SA Commons muscle chart
// ("Muscles front and back.svg", OpenStax / T. Kebert / umimeto.org).
const fs = require('fs');
const svgpath = require('svgpath');
const D = process.argv[2] || __dirname;
const theme = process.argv[3] || 'dark';
const { parts } = JSON.parse(fs.readFileSync(D + '/parts.json', 'utf8'));
const AXIS = { front: 102.25, back: 315 };
// Back of the neck: the chart's striped splenius strips (path1327, path1238 and their stripes
// path1339/1343/1347, labelled traps) and the nuchal ligament band (path1376) running up to the
// skull made the neck unreadable. Without them the traps read as one kite split by the spine line.
const HIDDEN = new Set([
  'path1304-3',
  'use1903',
  'path1327',
  'path1238',
  'path1339',
  'path1343',
  'path1347',
  'path1376',
]);
const bump = (v, c, w) => Math.exp(-(((v - c) / w) ** 2));

// Horizontal scale of the distance to the body axis, by height (and how far out the point is).
function k(y, dist) {
  const arm = Math.min(1, Math.max(0, (dist - 30) / 15)); // 0 on the torso, 1 on the arms
  return (
    1 +
    0.32 * bump(y, 58, 9) + // neck and upper traps
    0.17 * bump(y, 93, 17) + // shoulders, chest, upper back
    0.1 * arm * bump(y, 125, 30) + // upper arms and forearms
    -0.12 * (1 - arm) * bump(y, 158, 16) + // waist
    0.12 * bump(y, 210, 30) + // thighs
    0.1 * bump(y, 280, 22) // calves
  );
}
// The chart's two views disagree on the shoulder line: the back has the longer, more natural
// trapezius slope (neck at y 52, deltoid top at y 77), the front a short one (56 → 65). Remap the
// front's heights onto the back's landmarks so both views share the back's shoulder line.
const FRONT_TO_BACK_Y = [
  [0, 0],
  [8, 6.4],
  [56, 52],
  [64.6, 77.3],
  [102, 109],
  [178, 178],
  [344.2, 342.2],
  [400, 400],
];
function remapY(view, y) {
  if (view !== 'front') return y;
  const t = FRONT_TO_BACK_Y;
  for (let i = 1; i < t.length; i++) {
    const [a0, b0] = t[i - 1],
      [a1, b1] = t[i];
    if (y <= a1) return b0 + ((y - a0) * (b1 - b0)) / (a1 - a0);
  }
  return y;
}
const HEAD_BOTTOM = { front: 52, back: 52 };
const HEAD_SCALE = 0.84;
function warpPoint(view, x, y0) {
  const A = AXIS[view];
  const y = remapY(view, y0);
  if (y < HEAD_BOTTOM[view]) {
    // Smaller head, kept on the neck.
    const hb = HEAD_BOTTOM[view];
    return [A + (x - A) * HEAD_SCALE, hb - (hb - y) * HEAD_SCALE];
  }
  const dx = x - A;
  // Traps bulge upward next to the neck.
  const lift = 5 * bump(Math.abs(dx), 18, 10) * bump(y, 64, 10);
  return [A + dx * k(y, Math.abs(dx)), y - lift];
}
function flatten(view, p) {
  return svgpath(p.d)
    .matrix(p.m)
    .abs()
    .unarc()
    .unshort()
    .iterate((seg) => {
      const s = seg.slice();
      const cmd = s[0];
      const pairs = cmd === 'H' || cmd === 'V' ? [] : [];
      if (cmd === 'H' || cmd === 'V') return [s];
      for (let i = 1; i + 1 < s.length; i += 2) {
        const [nx, ny] = warpPoint(view, s[i], s[i + 1]);
        s[i] = nx;
        s[i + 1] = ny;
      }
      return [s];
    })
    .round(2)
    .toString();
}
const palette = {
  chest: 'hsl(0 70% 46%)',
  shoulders_front: 'hsl(60 70% 46%)',
  triceps: 'hsl(60 70% 46%)',
  shoulders_side: 'hsl(75 70% 46%)',
  lats: 'hsl(100 70% 46%)',
  upper_back: 'hsl(100 70% 46%)',
  shoulders_rear: 'hsl(105 70% 46%)',
  biceps: 'hsl(110 70% 46%)',
  quads: 'hsl(120 70% 46%)',
  hamstrings: 'hsl(120 70% 46%)',
  glutes: 'hsl(120 70% 46%)',
};
const T =
  theme === 'light'
    ? { bg: '#ffffff', body: '#d9d9d9', tendon: '#bdbdbd', ink: '#000000', neutral: 'hsl(0 0% 62%)' }
    : { bg: '#000000', body: '#2a2a2a', tendon: '#3a3a3a', ink: '#000000', neutral: 'hsl(0 0% 55%)' };
const color = (m) => palette[m] ?? T.neutral;

// Groove between the deltoid and the clavicular head of the pectoral, as drawn on the chart.
// The deltoid's front border exactly as the chart draws it (path879, the fine line from the
// armpit up to the clavicle). Below it: the pectoral; above it: the deltoid.
// Followed all the way to the clavicle: the band above the pectoral is the front deltoid head.
const GROOVE = [
  [59.2, 94],
  [59.7, 91],
  [61, 87],
  [62.9, 83.5],
  [67, 79],
  [73.6, 75.1],
  [80, 72.5],
  [88.7, 69.8],
  [92, 67],
  [97, 62],
  [98, 50],
];
// Front/side deltoid split: an oblique line across the cap.
const SIDE_LINE = [
  [64, 64],
  [58, 75],
  [55, 87],
  [53, 100],
];
const FRONT_DELT_REGIONS = [
  ['chest', [...GROOVE, [104, 50], [104, 125], [59, 125]]],
  [
    'shoulders_front',
    [[66, 50], ...GROOVE.slice().reverse(), [59.2, 125], [52, 125], ...SIDE_LINE.slice().reverse()],
  ],
  ['shoulders_side', [[30, 50], [66, 50], ...SIDE_LINE, [52, 125], [30, 125]]],
];
// Back (left copy, axis 315): rear deltoid towards the spine, side cap outside an oblique line.
const BACK_SIDE_LINE = [
  [287, 74],
  [280, 88],
  [274, 100],
  [270, 112],
];
const BACK_DELT_REGIONS = [
  ['shoulders_rear', [[287, 70], [316, 70], [316, 120], [270, 120], ...BACK_SIDE_LINE.slice().reverse()]],
  ['shoulders_side', [[250, 70], [287, 70], ...BACK_SIDE_LINE, [270, 120], [250, 120]]],
];
function densify(poly, step = 2) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i],
      [x2, y2] = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let j = 0; j < n; j++) out.push([x1 + ((x2 - x1) * j) / n, y1 + ((y2 - y1) * j) / n]);
  }
  return out;
}

const ART = {};
function view(name) {
  const art = (ART[name] = { parts: [], seams: [] });
  const list = parts.filter(
    (x) =>
      (name === 'front') === x.bb[0] + x.bb[2] / 2 < 203.5 &&
      x.bb[2] > 0.01 &&
      x.bb[3] > 0.01 &&
      !HIDDEN.has(x.src) &&
      !(name === 'front' && x.src === 'path1268'),
  );
  const shapes = [];
  for (const x of list) {
    // H/V segments: normalise to L first so the warp sees both coordinates.
    const d0 = svgpath(x.d)
      .matrix(x.m)
      .abs()
      .unarc()
      .unshort()
      .iterate((seg, i, px, py) => {
        if (seg[0] === 'H') return [['L', seg[1], py]];
        if (seg[0] === 'V') return [['L', px, seg[1]]];
        return [seg];
      })
      .toString();
    const d = flatten(name, { d: d0, m: [1, 0, 0, 1, 0, 0] });
    const cy = x.bb[1] + x.bb[3] / 2;
    const isHead = remapY(name, cy) < HEAD_BOTTOM[name] - 2 && !x.muscle;
    shapes.push({ ...x, d, isHead });
  }
  let defs = '',
    body = '',
    lines = '',
    k2 = 0;
  for (const s of shapes) {
    if (s.kind === 'line') {
      if (s.isHead) continue;
      art.parts.push({ k: 'line', d: s.d });
      lines += `<path d="${s.d}" fill="none" stroke="${T.ink}" stroke-width="0.55" stroke-linecap="round"/>`;
      continue;
    }
    const ink = s.isHead ? 'none' : T.ink;
    const fill = s.kind === 'muscle' ? null : s.kind === 'tendon' ? (s.isHead ? T.body : T.tendon) : T.body;
    if (s.muscle && s.muscle.startsWith('DELT')) {
      // Regions drawn on the ORIGINAL chart (left half), split along the deltopectoral groove the
      // chart itself draws; mirrored for the right side, then warped like every other point.
      const regions = s.muscle === 'DELT_FRONT' ? FRONT_DELT_REGIONS : BACK_DELT_REGIONS;
      const A = AXIS[name];
      const isLeft = s.bb[0] + s.bb[2] / 2 < A;
      for (const [mu, poly] of regions) {
        const pts = densify(poly).map(([x, y]) => warpPoint(name, isLeft ? x : 2 * A - x, y));
        const id = name + '-c' + k2++;
        defs += `<clipPath id="${id}"><path d="M${pts.map((q) => q.map((v) => v.toFixed(2)).join(' ')).join(' L')} Z"/></clipPath>`;
        body += `<g clip-path="url(#${id})"><path d="${s.d}" fill="${color(mu)}" stroke="${T.ink}" stroke-width="0.9" stroke-linejoin="round"/></g>`;
        art.parts.push({
          k: 'muscle',
          m: mu,
          d: s.d,
          clip: `M${pts.map((q) => q.map((v) => v.toFixed(2)).join(' ')).join(' L')} Z`,
        });
      }
      const shapeClip = name + '-s' + k2++;
      defs += `<clipPath id="${shapeClip}"><path d="${s.d}"/></clipPath>`;
      const seams = s.muscle === 'DELT_FRONT' ? [SIDE_LINE] : [BACK_SIDE_LINE];
      for (const seam of seams) {
        // Open polyline (no closing segment), densified so the warp bends it smoothly.
        const pts = [];
        for (let i = 0; i + 1 < seam.length; i++) {
          const [x1, y1] = seam[i],
            [x2, y2] = seam[i + 1];
          const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
          for (let j = 0; j < n; j++) pts.push([x1 + ((x2 - x1) * j) / n, y1 + ((y2 - y1) * j) / n]);
        }
        pts.push(seam[seam.length - 1]);
        const w = pts.map(([x, y]) => warpPoint(name, isLeft ? x : 2 * A - x, y));
        const width = 0.5; // separation between deltoid heads
        const seamD = `M${w.map((q) => q.map((v) => v.toFixed(2)).join(' ')).join(' L')}`;
        body += `<g clip-path="url(#${shapeClip})"><path d="${seamD}" fill="none" stroke="${T.ink}" stroke-width="${width}" stroke-linecap="round"/></g>`;
        art.seams.push({ d: seamD, clip: s.d });
      }
      continue;
    }
    const sw = s.bb[2] < 2 || s.bb[3] < 2 ? 0.35 : 0.9;
    // The two lumbar halves overlap across the spine and the right one is painted on top, which
    // shifts the centre line to the left. Each half is cut at the body's axis instead.
    let halfClip;
    if (s.muscle === 'lower_back') {
      const A = AXIS[name];
      const axis = warpPoint(name, A, s.bb[1] + s.bb[3] / 2)[0];
      // The shape also ends in a sharp point between the glutes: the clip rounds it off (`dir`
      // points away from the axis; the curve runs from the axis up to the flank).
      const ys = s.d
        .match(/-?\d+(\.\d+)?/g)
        .map(Number)
        .filter((_, i) => i % 2);
      const bottom = Math.max(...ys) - (Math.max(...ys) - Math.min(...ys)) * 0.17;
      const dir = s.bb[0] + s.bb[2] / 2 < A ? -1 : 1;
      const f = (v) => v.toFixed(2);
      const far = axis + dir * 400;
      halfClip =
        `M${f(far)} -400H${f(axis)}V${f(bottom)}` +
        `C${f(axis + dir * 5)} ${f(bottom)} ${f(axis + dir * 11)} ${f(bottom - 4)} ${f(axis + dir * 13)} ${f(bottom - 13)}` +
        `H${f(far)}Z`;
      const id = name + '-c' + k2++;
      defs += `<clipPath id="${id}"><path d="${halfClip}"/></clipPath>`;
      body += `<g clip-path="url(#${id})"><path d="${s.d}" fill="${color(s.muscle)}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/></g>`;
    } else {
      body += `<path d="${s.d}" fill="${fill ?? color(s.muscle)}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    }
    art.parts.push(
      s.kind === 'muscle'
        ? {
            k: 'muscle',
            m: s.muscle,
            d: s.d,
            ...(halfClip && { clip: halfClip }),
            ...(sw < 0.9 && { thin: true }),
          }
        : {
            k: s.kind === 'tendon' && !s.isHead ? 'tendon' : 'body',
            d: s.d,
            ...(s.isHead && { noInk: true }),
            ...(sw < 0.9 && { thin: true }),
          },
    );
  }
  // Heavy outer contour: the whole figure drawn first with a thick ink stroke.
  const thin = (s) => s.bb[2] < 2 || s.bb[3] < 2;
  const outlineShapes = shapes.filter((s) => s.kind !== 'line' && !thin(s));
  const outline = outlineShapes.map((s) => `<path d="${s.d}"/>`).join('');
  art.outline = undefined; // derived from the parts at render time (non-line, non-thin)
  const xs = [],
    ys = [];
  for (const s of shapes)
    for (const n of s.d
      .match(/-?\d+(\.\d+)?/g)
      .map(Number)
      .entries())
      (n[0] % 2 ? ys : xs).push(n[1]);
  // Same vertical frame for both views so they line up side by side.
  const vb = [Math.min(...xs) - 3, 4, Math.max(...xs) - Math.min(...xs) + 6, 344];
  art.viewBox = vb.map((v) => +v.toFixed(1)).join(' ');
  const guides = process.env.GUIDES
    ? [52, 77, 109, 178]
        .map(
          (y) =>
            `<line x1="${vb[0]}" x2="${vb[0] + vb[2]}" y1="${y}" y2="${y}" stroke="#0af" stroke-width="0.4"/>`,
        )
        .join('')
    : '';
  return `<svg viewBox="${vb.map((v) => v.toFixed(1)).join(' ')}" style="height:600px"><defs>${defs}</defs><g fill="${T.ink}" stroke="${T.ink}" stroke-width="3" stroke-linejoin="round">${outline}</g>${body}${lines}${guides}</svg>`;
}
fs.writeFileSync(
  __dirname + '/manga-' + theme + '.html',
  `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${T.bg};display:flex;gap:16px;padding:12px">${view('front')}${view('back')}</body>`,
);
if (process.env.EMIT) fs.writeFileSync(process.env.EMIT, JSON.stringify(ART));

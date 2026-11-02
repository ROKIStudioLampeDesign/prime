import type { BodyView, MuscleId } from '../../domain/muscles';

/**
 * Hand-authored, stylized body diagram on a 200 × 400 canvas (center line x = 100).
 * Paths are drawn for the viewer's left half only; `mirror: true` shapes are rendered a second
 * time flipped around x = 100, so the figure is symmetric by construction. Center shapes
 * (abs, back traps) are drawn once.
 */
export const VIEWBOX = '0 0 200 400';
export const CENTER_X = 100;

export interface MuscleShape {
  muscle: MuscleId;
  d: string;
  mirror: boolean;
}

/** Left half of the silhouette (neck → arm → torso → leg → crotch); mirrored to close the body. */
export const SILHOUETTE_HALF =
  'M100 46 L92 48 L91 58 C80 61 64 62 56 66 C46 70 43 84 44 98 L41 140 C39 152 36 170 36 190 L37 206 ' +
  'C33 214 32 226 37 234 C41 239 48 237 49 229 L50 208 C54 190 58 170 60 150 L64 112 C65 106 67 101 70 100 ' +
  'C72 130 74 160 72 182 C68 192 64 204 64 214 C64 250 67 290 71 306 C69 320 68 340 70 358 L72 384 ' +
  'C70 390 66 396 70 398 L93 398 C95 392 94 386 92 382 C94 360 95 330 94 310 C96 296 98 262 99 232 L100 224 Z';

export const HEAD = { cx: 100, cy: 31, rx: 15, ry: 19 };

const FRONT: MuscleShape[] = [
  { muscle: 'traps', mirror: true, d: 'M91 53 C85 58 74 61 64 65 C72 68 80 69 87 68 C90 65 91 60 91 53 Z' },
  {
    muscle: 'shoulders_side',
    mirror: true,
    d: 'M57 67 C49 70 45 80 46 96 C49 98 52 96 54 92 C54 82 56 74 61 69 Z',
  },
  {
    muscle: 'shoulders_front',
    mirror: true,
    d: 'M62 68 C57 73 55 82 55 92 C58 97 63 99 67 97 C69 88 71 77 75 70 C71 67 66 67 62 68 Z',
  },
  {
    muscle: 'chest',
    mirror: true,
    d: 'M99 70 C92 68 84 67 77 70 C72 78 70 90 71 100 C76 108 88 110 99 106 Z',
  },
  {
    muscle: 'biceps',
    mirror: true,
    d: 'M56 102 C52 112 50 126 50 138 C54 142 59 142 61 138 C63 126 65 112 65 103 C62 99 58 99 56 102 Z',
  },
  {
    muscle: 'forearms',
    mirror: true,
    d: 'M45 150 C42 164 40 180 40 198 C44 202 48 202 51 198 C54 182 57 166 58 151 C54 146 48 146 45 150 Z',
  },
  {
    muscle: 'obliques',
    mirror: true,
    d: 'M74 108 C79 112 83 114 86 118 L86 174 C82 178 78 181 74 183 C75 160 75 130 74 108 Z',
  },
  {
    muscle: 'abs',
    mirror: false,
    d: 'M88 112 C94 110 106 110 112 112 L113 176 C108 184 92 184 87 176 Z',
  },
  {
    muscle: 'quads',
    mirror: true,
    d: 'M68 214 C70 208 80 206 88 210 C91 230 92 262 90 290 C86 300 78 302 73 296 C69 270 67 240 68 214 Z',
  },
  {
    muscle: 'adductors',
    mirror: true,
    d: 'M90 213 C94 213 98 218 99 226 C98 244 95 262 91 272 C92 252 91 232 90 213 Z',
  },
  {
    muscle: 'calves',
    mirror: true,
    d: 'M72 316 C69 332 70 350 73 364 C77 369 81 363 82 352 C83 336 81 322 78 313 Z',
  },
  {
    muscle: 'calves',
    mirror: true,
    d: 'M86 316 C91 326 93 344 91 360 C89 367 86 365 85 358 C84 346 84 330 86 316 Z',
  },
];

const BACK: MuscleShape[] = [
  {
    muscle: 'upper_back',
    mirror: true,
    d: 'M70 76 C78 78 86 84 88 90 C90 100 90 108 88 114 C82 114 74 110 70 104 C68 94 68 84 70 76 Z',
  },
  {
    muscle: 'lats',
    mirror: true,
    d: 'M72 108 C78 114 86 118 92 122 C96 130 97 146 96 160 C90 168 82 174 76 178 C74 160 74 132 72 108 Z',
  },
  {
    muscle: 'lower_back',
    mirror: true,
    d: 'M92 162 C95 158 98 156 99 154 L99 196 C96 194 92 192 88 190 C88 182 90 170 92 162 Z',
  },
  {
    muscle: 'traps',
    mirror: false,
    d:
      'M100 50 C96 56 90 58 80 62 C72 64 66 66 62 68 C72 72 82 76 88 84 C92 96 96 110 100 122 ' +
      'C104 110 108 96 112 84 C118 76 128 72 138 68 C134 66 128 64 120 62 C110 58 104 56 100 50 Z',
  },
  {
    muscle: 'shoulders_side',
    mirror: true,
    d: 'M57 67 C49 70 45 80 46 96 C49 98 52 96 54 92 C54 82 56 74 61 69 Z',
  },
  {
    muscle: 'shoulders_rear',
    mirror: true,
    d: 'M62 69 C57 74 55 82 55 92 C58 98 64 100 68 96 C70 88 70 78 66 70 Z',
  },
  {
    muscle: 'triceps',
    mirror: true,
    d: 'M50 100 C48 112 47 126 48 140 C52 144 58 144 61 140 C63 126 64 112 64 102 C60 98 54 98 50 100 Z',
  },
  {
    muscle: 'forearms',
    mirror: true,
    d: 'M45 150 C42 164 40 180 40 198 C44 202 48 202 51 198 C54 182 57 166 58 151 C54 146 48 146 45 150 Z',
  },
  {
    muscle: 'glutes',
    mirror: true,
    d: 'M72 196 C80 190 92 190 99 196 L99 236 C92 242 80 242 72 236 C68 224 68 208 72 196 Z',
  },
  {
    muscle: 'hamstrings',
    mirror: true,
    d: 'M70 244 C78 240 90 242 96 246 C96 268 94 290 90 302 C84 306 78 306 74 300 C70 282 68 262 70 244 Z',
  },
  {
    muscle: 'calves',
    mirror: true,
    d: 'M73 314 C70 330 71 350 76 366 C82 370 88 368 90 362 C93 346 93 330 90 314 C84 308 78 308 73 314 Z',
  },
];

/**
 * Decorative lines drawn over the muscles in the background color (abs segments), so the shapes
 * read as anatomy rather than blocks. Not interactive.
 */
export const DETAILS: Readonly<Record<BodyView, readonly string[]>> = {
  front: ['M100 113 L100 181', 'M88.5 128 L111.5 128', 'M88 144 L112 144', 'M87.5 160 L112.5 160'],
  back: [],
};

export const MUSCLE_SHAPES: Readonly<Record<BodyView, readonly MuscleShape[]>> = { front: FRONT, back: BACK };

/**
 * Approximate surface of a path: shoelace formula over its points (Bézier control points included).
 * Good enough to rank shapes by size, which bounding boxes are not for thin crescents.
 */
export function approxArea(d: string): number {
  const n = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  let twice = 0;
  for (let i = 0; i + 1 < n.length; i += 2) {
    const x1 = n[i] ?? 0;
    const y1 = n[i + 1] ?? 0;
    const x2 = n[(i + 2) % n.length] ?? 0;
    const y2 = n[(i + 3) % n.length] ?? 0;
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
}

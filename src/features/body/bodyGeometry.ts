import type { BodyView, MuscleId } from '../../domain/muscles';

/**
 * Hand-authored "athletic" body diagram on a 200 × 400 canvas (center line x = 100): about eight
 * heads tall, arms apart from the torso, a V-taper (broad shoulders and back, tight waist).
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

/** Left half of the silhouette (neck → arm → hand → torso → leg → foot → crotch); mirrored. */
export const SILHOUETTE_HALF =
  'M 100 54 L 92.8 54 C 91.6 60 91.5 64 90.3 67 C 83.6 71 73.6 73 62.4 75 C 49.9 77 41.2 84 38.6 96 C 37.9 108 39.3 120 41.5 132 C 41.6 140 41.5 146 41.6 152 C 40.8 164 38.9 180 36.5 198 L 35.7 204 C 31.8 211 29.7 222 32 230 C 33.7 236 38.9 237 42.3 233 C 44.8 227 45.5 218 45.1 210 L 45.7 204 C 49.6 190 54.3 174 55.4 160 C 55.2 152 55.4 146 55.7 140 C 55.4 128 54.7 116 55.6 108 C 57.4 104 61.8 103 66.5 106 C 69.1 120 73.6 136 76.5 150 C 78.2 160 78.5 166 77.7 172 C 74.3 184 70.6 194 68.7 206 C 65.8 224 65 246 68.4 264 C 71 278 73.4 288 74.7 296 C 72.8 304 71.9 312 71.9 320 C 71 334 73 350 77 366 C 78 374 79 380 79 386 C 75 391 73 396 77 398 L 94 398 C 95 394 93 389 90 386 C 90 378 90 372 90 366 C 92 350 94 334 92 318 C 91 310 91.9 304 93.9 298 C 95.9 282 97.9 262 98.9 240 L 100 214 Z';

export const HEAD = { cx: 100, cy: 33.5, rx: 15, ry: 23.5 };

const FRONT: MuscleShape[] = [
  {
    muscle: 'traps',
    mirror: true,
    d: 'M 91.5 62 C 86 67 76 71 64.7 74 C 73.3 77 82.2 78 87.8 77 C 90.1 72 91.4 67 91.5 62 Z',
  },
  {
    muscle: 'shoulders_side',
    mirror: true,
    d: 'M 59 76 C 48.7 78 41.1 85 38.6 96 C 38.3 104 39.4 110 42.8 116 C 44.9 110 46.8 100 48.7 92 C 51.2 86 55 81 61.1 77 Z',
  },
  {
    muscle: 'shoulders_front',
    mirror: true,
    d: 'M 63.3 77 C 56.1 81 52.2 89 51.1 97 C 50.8 105 52.8 111 55.6 115 C 59.4 111 62.9 103 65.9 96 C 69.3 89 72.8 84 77.6 80 C 73.3 77 67.8 76 63.3 77 Z',
  },
  {
    muscle: 'chest',
    mirror: true,
    d: 'M 98.9 80 C 91.1 79 84.3 79 78.6 81 C 71.6 87 67 97 67.7 107 C 71.9 116 82 121 90.4 120 C 94.7 119 97.8 117 98.9 115 Z',
  },
  {
    muscle: 'biceps',
    mirror: true,
    d: 'M 51.1 114 C 47.1 122 45.6 132 46.9 142 C 50.7 148 55.7 148 57.2 144 C 58.1 134 58 124 56.5 114 C 54.8 110 52.6 110 51.1 114 Z',
  },
  {
    muscle: 'forearms',
    mirror: true,
    d: 'M 43.3 156 C 42.1 168 40.4 182 38.8 196 C 41.2 200 45.2 200 47.7 196 C 52.7 182 55.3 170 55.4 160 C 51.5 153 45.5 152 43.3 156 Z',
  },
  {
    muscle: 'obliques',
    mirror: true,
    d: 'M 72.7 124 C 78.2 128 82.5 132 84.8 138 L 85.9 178 C 83 182 80.9 186 78.7 190 C 80.4 172 78.4 150 72.7 124 Z',
  },
  {
    muscle: 'abs',
    mirror: false,
    d: 'M 87.4 124 C 93.7 122 106.3 122 112.6 124 L 112.3 182 C 107.8 192 92.2 192 87.7 182 Z',
  },
  {
    muscle: 'quads',
    mirror: true,
    d: 'M 71.3 216 C 74.6 209 83.8 207 90.8 211 C 93.7 234 93.7 262 90.8 286 C 87.8 294 81.8 296 77.6 291 C 71.7 268 68.3 242 71.3 216 Z',
  },
  {
    muscle: 'adductors',
    mirror: true,
    d: 'M 92.9 212 C 95.9 214 99 220 99 230 C 97.9 246 95.8 260 92.7 270 C 93.6 250 93.7 230 92.9 212 Z',
  },
  {
    muscle: 'calves',
    mirror: true,
    d: 'M 76 320 C 73 334 74 350 78 364 C 82 368 84 362 85 350 C 86 336 84 326 80.9 316 Z',
  },
  {
    muscle: 'calves',
    mirror: true,
    d: 'M 88 318 C 91 330 92 346 90 360 C 88 366 87 364 86 356 C 85 344 86 330 88 318 Z',
  },
];

const BACK: MuscleShape[] = [
  {
    muscle: 'traps',
    mirror: false,
    d: 'M 100 56 C 95.8 62 89.3 66 78.3 70 C 71.5 72 64.7 74 60.1 76 C 70.8 80 81.9 84 87.5 92 C 92.1 104 96.8 116 100 128 C 103.2 116 107.9 104 112.5 92 C 118.1 84 129.2 80 139.9 76 C 135.3 74 128.5 72 121.7 70 C 110.7 66 104.2 62 100 56 Z',
  },
  {
    muscle: 'shoulders_side',
    mirror: true,
    d: 'M 59 76 C 48.7 78 41.1 85 38.6 96 C 38.3 104 39.4 110 42.8 116 C 44.9 110 46.8 100 48.7 92 C 51.2 86 55 81 61.1 77 Z',
  },
  {
    muscle: 'shoulders_rear',
    mirror: true,
    d: 'M 62.1 78 C 56 82 52.1 90 51.2 98 C 52 106 54.8 110 58.3 111 C 62 105 65.9 97 67 90 C 66.1 84 64.1 80 62.1 78 Z',
  },
  {
    muscle: 'upper_back',
    mirror: true,
    d: 'M 70.5 86 C 78.4 88 84 93 86.4 100 C 88.9 108 89.1 114 88.3 120 C 83 120 76.2 116 71.3 110 C 68.4 102 68.1 93 70.5 86 Z',
  },
  {
    muscle: 'lats',
    mirror: true,
    d: 'M 69.6 114 C 77.6 120 86.3 124 92.7 128 C 97 136 98 150 97.2 164 C 91.6 172 85 178 80.1 182 C 80.1 160 76.6 136 69.6 114 Z',
  },
  {
    muscle: 'lower_back',
    mirror: true,
    d: 'M 93.4 166 C 96.2 162 98.1 160 99 158 L 99 200 C 96 198 92.1 196 88.2 194 C 88.5 186 90.7 174 93.4 166 Z',
  },
  {
    muscle: 'triceps',
    mirror: true,
    d: 'M 41.2 108 C 40 118 41.3 131 44.2 144 C 48.9 149 53.8 149 56.3 145 C 56.9 132 56.3 120 54.8 110 C 49.7 105 45.2 105 41.2 108 Z',
  },
  {
    muscle: 'forearms',
    mirror: true,
    d: 'M 43.3 156 C 42.1 168 40.4 182 38.8 196 C 41.2 200 45.2 200 47.7 196 C 52.7 182 55.3 170 55.4 160 C 51.5 153 45.5 152 43.3 156 Z',
  },
  {
    muscle: 'glutes',
    mirror: true,
    d: 'M 73.2 198 C 81.5 192 92.2 192 99 198 L 98.9 238 C 91.5 244 79.9 244 71.5 238 C 67.8 226 68.5 210 73.2 198 Z',
  },
  {
    muscle: 'hamstrings',
    mirror: true,
    d: 'M 70.3 248 C 77.8 244 89.4 246 95.8 250 C 95.8 270 93.9 288 89.9 298 C 84.9 302 78.8 302 74.7 296 C 70.1 280 68.4 264 70.3 248 Z',
  },
  {
    muscle: 'calves',
    mirror: true,
    d: 'M 74.9 318 C 72 334 73 350 78 366 C 84 370 88 368 90 362 C 93 346 93 332 90 318 C 84.9 312 78.9 312 74.9 318 Z',
  },
];

/**
 * Decorative lines drawn over the muscles in the background color (abs segments, collarbones,
 * kneecaps), so the shapes read as anatomy rather than blocks. Not interactive.
 */
export const DETAILS: Readonly<Record<BodyView, readonly string[]>> = {
  front: [
    'M 100 125 L 100 189',
    'M 87.9 139 L 112.1 139',
    'M 87.9 154 L 112.1 154',
    'M 87.9 168 L 112.1 168',
    'M 77.7 297 C 81.8 301 86.9 301 90.9 297',
    'M 122.3 297 C 118.2 301 113.1 301 109.1 297',
    'M 92.4 70 C 84.7 72 75.8 74 69 75',
    'M 107.6 70 C 115.3 72 124.2 74 131 75',
  ],
  back: ['M 77.7 296 C 81.8 300 86.9 300 90.9 296', 'M 122.3 296 C 118.2 300 113.1 300 109.1 296'],
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

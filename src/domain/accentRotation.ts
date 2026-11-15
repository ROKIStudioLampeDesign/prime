/**
 * The app's colour changes every half hour. Which colour a half hour gets is derived from the
 * clock alone (no stored state): the app shows the same colour after a reload, and knows the
 * next one in advance.
 */
export const ACCENT_SLOT_MS = 30 * 60_000;

/** Index of the half hour containing `now` (epoch ms). */
export const accentSlot = (now: number) => Math.floor(now / ACCENT_SLOT_MS);

/** When the half hour containing `now` ends (epoch ms). */
export const nextAccentChange = (now: number) => (accentSlot(now) + 1) * ACCENT_SLOT_MS;

/** How far into its half hour `now` is, from 0 to 1. */
export const accentSlotProgress = (now: number) => (now - accentSlot(now) * ACCENT_SLOT_MS) / ACCENT_SLOT_MS;

/** Small seeded generator (mulberry32): the same seed always gives the same sequence. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(cycle: number, count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  const random = seededRandom(cycle);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = order[i];
    const b = order[j];
    if (a === undefined || b === undefined) continue;
    order[i] = b;
    order[j] = a;
  }
  return order;
}

/**
 * Which of `count` colours a slot shows. Slots are grouped in cycles of `count`; each cycle is a
 * shuffle of all the colours, so every colour comes up once before any comes back, and the same
 * colour never shows twice in a row (the start of a cycle is swapped when it would repeat the end
 * of the previous one).
 */
export function accentIndexForSlot(slot: number, count: number): number {
  if (count <= 1) return 0;
  // Two colours can only alternate.
  if (count === 2) return ((slot % 2) + 2) % 2;
  const cycle = Math.floor(slot / count);
  const position = slot - cycle * count;
  const order = shuffled(cycle, count);
  // The previous cycle's last colour is never moved by its own swap, so one look back is enough.
  const previousLast = shuffled(cycle - 1, count)[count - 1];
  const first = order[0];
  const second = order[1];
  if (first === previousLast && first !== undefined && second !== undefined) {
    order[0] = second;
    order[1] = first;
  }
  return order[position] ?? 0;
}

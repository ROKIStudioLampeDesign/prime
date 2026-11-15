import { describe, expect, it } from 'vitest';
import {
  ACCENT_SLOT_MS,
  accentIndexForSlot,
  accentSlot,
  accentSlotProgress,
  nextAccentChange,
} from './accentRotation';

describe('accentSlot', () => {
  it('changes exactly on the half hour', () => {
    const start = 1000 * ACCENT_SLOT_MS;
    expect(accentSlot(start - 1)).toBe(999);
    expect(accentSlot(start)).toBe(1000);
    expect(accentSlot(start + ACCENT_SLOT_MS - 1)).toBe(1000);
    expect(accentSlot(start + ACCENT_SLOT_MS)).toBe(1001);
  });

  it('gives the end of the current half hour', () => {
    const start = 1000 * ACCENT_SLOT_MS;
    expect(nextAccentChange(start)).toBe(start + ACCENT_SLOT_MS);
    expect(nextAccentChange(start + 1)).toBe(start + ACCENT_SLOT_MS);
    expect(nextAccentChange(start + ACCENT_SLOT_MS - 1)).toBe(start + ACCENT_SLOT_MS);
  });

  it('measures progress within the half hour', () => {
    const start = 1000 * ACCENT_SLOT_MS;
    expect(accentSlotProgress(start)).toBe(0);
    expect(accentSlotProgress(start + ACCENT_SLOT_MS / 2)).toBe(0.5);
    expect(accentSlotProgress(start + ACCENT_SLOT_MS - 1)).toBeLessThan(1);
  });
});

describe('accentIndexForSlot', () => {
  it('always gives the only colour when there is one or none', () => {
    expect(accentIndexForSlot(42, 1)).toBe(0);
    expect(accentIndexForSlot(42, 0)).toBe(0);
  });

  it('is deterministic', () => {
    for (let slot = 980_000; slot < 980_050; slot++) {
      expect(accentIndexForSlot(slot, 16)).toBe(accentIndexForSlot(slot, 16));
    }
  });

  it.each([2, 3, 5, 16])('stays in range and never repeats a colour twice in a row (%i colours)', (count) => {
    let previous = accentIndexForSlot(979_999, count);
    for (let slot = 980_000; slot < 984_000; slot++) {
      const index = accentIndexForSlot(slot, count);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(count);
      expect(index).not.toBe(previous);
      previous = index;
    }
  });

  it('shows every colour once per cycle', () => {
    const count = 16;
    for (let cycle = 61_000; cycle < 61_050; cycle++) {
      const seen = new Set<number>();
      for (let position = 0; position < count; position++) {
        seen.add(accentIndexForSlot(cycle * count + position, count));
      }
      expect(seen.size).toBe(count);
    }
  });

  it('does not follow the same order every cycle', () => {
    const count = 16;
    const orderOf = (cycle: number) =>
      Array.from({ length: count }, (_, position) =>
        accentIndexForSlot(cycle * count + position, count),
      ).join();
    expect(orderOf(61_000)).not.toBe(orderOf(61_001));
  });
});

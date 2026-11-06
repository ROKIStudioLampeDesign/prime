import { describe, expect, it } from 'vitest';
import { isValidGtin, normalizeBarcode, scannerZoom, scanRegion } from './barcode';

describe('barcodes', () => {
  it('normalizes spaces and dashes', () => {
    expect(normalizeBarcode(' 3017 6204-22003 ')).toBe('3017620422003');
  });

  it('accepts valid EAN-13, EAN-8, UPC-A and GTIN-14', () => {
    expect(isValidGtin('3017620422003')).toBe(true); // Nutella 400 g
    expect(isValidGtin('5449000000996')).toBe(true); // Coca-Cola 33 cl
    expect(isValidGtin('96385074')).toBe(true); // EAN-8
    expect(isValidGtin('036000291452')).toBe(true); // UPC-A
    expect(isValidGtin('10012345678902')).toBe(true); // GTIN-14
    expect(isValidGtin('3017 6204 22003')).toBe(true);
  });

  it('rejects wrong check digits, lengths and characters', () => {
    expect(isValidGtin('3017620422004')).toBe(false);
    expect(isValidGtin('301762042200')).toBe(false); // 12 digits, wrong check for UPC
    expect(isValidGtin('12345')).toBe(false);
    expect(isValidGtin('30176204220AB')).toBe(false);
    expect(isValidGtin('')).toBe(false);
  });
});

describe('scannerZoom', () => {
  it('aims for 2×, clamped to the camera range', () => {
    expect(scannerZoom({ min: 1, max: 10 })).toBe(2);
    expect(scannerZoom({ min: 1, max: 1.5 })).toBe(1.5);
    expect(scannerZoom({ min: 2.5, max: 6 })).toBe(2.5);
    expect(scannerZoom({ max: 4 }, 1)).toBe(1);
  });

  it('gives nothing when zoom is not adjustable', () => {
    expect(scannerZoom(undefined)).toBeUndefined();
    expect(scannerZoom({})).toBeUndefined();
    expect(scannerZoom({ min: 1, max: 1 })).toBeUndefined();
  });
});

describe('scanRegion', () => {
  it('keeps the visible width of a portrait stream and its central band', () => {
    // 1080×1920 shown in a 390×650 box: scale 0.3611, visible 1080 × 1800.
    expect(scanRegion({ width: 1080, height: 1920 }, { width: 390, height: 650 })).toEqual({
      x: 0,
      y: 510,
      width: 1080,
      height: 900,
    });
  });

  it('drops the sides cropped off a landscape stream in a portrait box', () => {
    // 1920×1080 in 390×650: scale 0.6019, visible 648 × 1080.
    expect(scanRegion({ width: 1920, height: 1080 }, { width: 390, height: 650 }, 0.4)).toEqual({
      x: 636,
      y: 324,
      width: 648,
      height: 432,
    });
  });

  it('clamps the band and falls back to the whole frame without sizes', () => {
    expect(scanRegion({ width: 100, height: 200 }, { width: 100, height: 200 }, 2)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 200,
    });
    expect(scanRegion({ width: 640, height: 480 }, { width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 480,
    });
    expect(scanRegion({ width: 0, height: 0 }, { width: 390, height: 650 })).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});

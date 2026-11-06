import { describe, expect, it } from 'vitest';
import { isValidGtin, normalizeBarcode, scannerZoom } from './barcode';

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

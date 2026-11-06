/** Strips spaces and dashes typed or printed around a barcode. */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}

/**
 * True for a GTIN (EAN-8, UPC-A/EAN-12, EAN-13, GTIN-14) with a valid check digit — the codes
 * printed on food packaging and used by Open Food Facts.
 */
export function isValidGtin(raw: string): boolean {
  const code = normalizeBarcode(raw);
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop() as number;
  // From the right (excluding the check digit), weights alternate 3, 1, 3, 1…
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Zoom the scanner aims for: a barcode fills the frame from ~25 cm, where iPhones focus sharply. */
export const SCANNER_ZOOM = 2;

/**
 * Zoom to apply given the camera's zoom range, or undefined when zoom can't be set (no range,
 * or a range that can't reach above 1×). Clamped to the range.
 */
export function scannerZoom(
  range: { min?: number; max?: number } | undefined,
  wanted = SCANNER_ZOOM,
): number | undefined {
  if (!range || range.max === undefined || !(range.max > 1)) return undefined;
  const min = range.min ?? 1;
  return Math.min(range.max, Math.max(min, wanted));
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Part of a video frame worth decoding: the area actually visible on screen (the video is shown
 * with `object-fit: cover`, so edges may be cropped), then its central horizontal band (`band` of
 * its height), where the aiming frame is. Fewer pixels per frame means more frames tried per
 * second. Integer pixels; the whole frame when a size is unknown (0).
 */
export function scanRegion(
  video: { width: number; height: number },
  view: { width: number; height: number },
  band = 0.5,
): Rect {
  const full = { x: 0, y: 0, width: Math.round(video.width), height: Math.round(video.height) };
  if (!(video.width > 0 && video.height > 0 && view.width > 0 && view.height > 0)) return full;
  const scale = Math.max(view.width / video.width, view.height / video.height);
  const visibleW = Math.min(video.width, view.width / scale);
  const visibleH = Math.min(video.height, view.height / scale);
  const height = visibleH * Math.min(1, Math.max(0, band));
  const x = (video.width - visibleW) / 2;
  const y = (video.height - height) / 2;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(visibleW)),
    height: Math.max(1, Math.round(height)),
  };
}

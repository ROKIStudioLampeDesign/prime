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

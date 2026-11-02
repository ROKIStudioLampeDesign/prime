/**
 * Parses a number typed by the user, accepting a French decimal comma ("12,5").
 * Returns undefined for an empty field and NaN for garbage, so callers can tell them apart.
 */
export function parseDecimal(raw: string): number | undefined {
  const text = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (text === '') return undefined;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return NaN;
  return Number(text);
}

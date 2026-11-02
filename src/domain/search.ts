/** Lowercases and strips diacritics so "Crème" matches "creme" and "Œuf" matches "oeuf". */
export function normalizeText(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      // Ligatures have no NFD decomposition.
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Every whitespace-separated term of the query must appear somewhere in the haystack. */
export function matchesQuery(normalizedHaystack: string, query: string): boolean {
  const terms = normalizeText(query).split(' ').filter(Boolean);
  return terms.every((term) => normalizedHaystack.includes(term));
}

export interface SearchableItem {
  /** Unique across item kinds, e.g. "food:3" or "meal:3". */
  key: string;
  name: string;
  brand?: string;
  favorite: boolean;
}

/**
 * Filters foods and meals by query and orders them: favorites, then recently logged (most recent first),
 * then alphabetically. Within favorites, recent ones come first too.
 * `recentKeys` is ordered most recent first.
 */
export function rankItems<T extends SearchableItem>(
  items: readonly T[],
  query: string,
  recentKeys: readonly string[],
): T[] {
  const recentRank = new Map(recentKeys.map((key, i) => [key, i]));
  const collator = new Intl.Collator('fr', { sensitivity: 'base' });
  return items
    .filter((f) => !query.trim() || matchesQuery(normalizeText(`${f.name} ${f.brand ?? ''}`), query))
    .sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      const ra = recentRank.get(a.key) ?? Infinity;
      const rb = recentRank.get(b.key) ?? Infinity;
      if (ra !== rb) return ra - rb;
      return collator.compare(a.name, b.name);
    });
}

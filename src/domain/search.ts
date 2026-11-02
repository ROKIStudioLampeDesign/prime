/** Lowercases and strips diacritics so "Crème" matches "creme". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every whitespace-separated term of the query must appear somewhere in the haystack. */
export function matchesQuery(normalizedHaystack: string, query: string): boolean {
  const terms = normalizeText(query).split(' ').filter(Boolean);
  return terms.every((term) => normalizedHaystack.includes(term));
}

export interface SearchableFood {
  id: number;
  name: string;
  brand?: string;
  favorite: boolean;
}

/**
 * Filters foods by query and orders them: favorites, then recently logged (most recent first),
 * then alphabetically. Within favorites, recent ones come first too.
 * `recentIds` is ordered most recent first.
 */
export function rankFoods<T extends SearchableFood>(
  foods: readonly T[],
  query: string,
  recentIds: readonly number[],
): T[] {
  const recentRank = new Map(recentIds.map((id, i) => [id, i]));
  const collator = new Intl.Collator('fr', { sensitivity: 'base' });
  return foods
    .filter((f) => !query.trim() || matchesQuery(normalizeText(`${f.name} ${f.brand ?? ''}`), query))
    .sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      const ra = recentRank.get(a.id) ?? Infinity;
      const rb = recentRank.get(b.id) ?? Infinity;
      if (ra !== rb) return ra - rb;
      return collator.compare(a.name, b.name);
    });
}

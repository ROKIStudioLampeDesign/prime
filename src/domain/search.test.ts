import { describe, expect, it } from 'vitest';
import { matchesQuery, normalizeText, rankItems, type SearchableItem } from './search';

describe('normalizeText', () => {
  it('strips accents, lowercases and collapses whitespace', () => {
    expect(normalizeText('  Crème   Fraîche ÉPAISSE ')).toBe('creme fraiche epaisse');
    expect(normalizeText('Œufs brouillés')).toBe('oeufs brouilles');
    expect(normalizeText('Cæsar')).toBe('caesar');
    expect(normalizeText('')).toBe('');
  });
});

describe('matchesQuery', () => {
  it('matches every term regardless of accents, case and order', () => {
    const hay = normalizeText('Crème fraîche Président');
    expect(matchesQuery(hay, 'creme')).toBe(true);
    expect(matchesQuery(hay, 'PRESIDENT crè')).toBe(true);
    expect(matchesQuery(hay, 'creme lait')).toBe(false);
    expect(matchesQuery(hay, '   ')).toBe(true);
  });
});

describe('rankItems', () => {
  const foods: SearchableItem[] = [
    { key: 'f1', name: 'Riz basmati', favorite: false },
    { key: 'f2', name: 'Avoine', favorite: false },
    { key: 'f3', name: 'Blanc de poulet', favorite: true },
    { key: 'f4', name: 'Écrémé lait', brand: 'Lactel', favorite: false },
    { key: 'f5', name: 'Banane', favorite: true },
  ];

  it('orders favorites, then recents, then alphabetically', () => {
    const ranked = rankItems(foods, '', ['f1', 'f5']).map((f) => f.key);
    expect(ranked).toEqual(['f5', 'f3', 'f1', 'f2', 'f4']);
  });

  it('sorts alphabetically ignoring accents', () => {
    const ranked = rankItems(foods, '', []).map((f) => f.key);
    expect(ranked).toEqual(['f5', 'f3', 'f2', 'f4', 'f1']);
  });

  it('filters by name and brand, accent-insensitive', () => {
    expect(rankItems(foods, 'ecreme', []).map((f) => f.key)).toEqual(['f4']);
    expect(rankItems(foods, 'lactel', []).map((f) => f.key)).toEqual(['f4']);
    expect(rankItems(foods, 'zzz', [])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const copy = [...foods];
    rankItems(foods, '', ['f2']);
    expect(foods).toEqual(copy);
  });
});

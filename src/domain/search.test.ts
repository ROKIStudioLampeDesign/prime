import { describe, expect, it } from 'vitest';
import { matchesQuery, normalizeText, rankFoods, type SearchableFood } from './search';

describe('normalizeText', () => {
  it('strips accents, lowercases and collapses whitespace', () => {
    expect(normalizeText('  Crème   Fraîche ÉPAISSE ')).toBe('creme fraiche epaisse');
    expect(normalizeText('Œuf')).toBe('œuf');
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

describe('rankFoods', () => {
  const foods: SearchableFood[] = [
    { id: 1, name: 'Riz basmati', favorite: false },
    { id: 2, name: 'Avoine', favorite: false },
    { id: 3, name: 'Blanc de poulet', favorite: true },
    { id: 4, name: 'Écrémé lait', brand: 'Lactel', favorite: false },
    { id: 5, name: 'Banane', favorite: true },
  ];

  it('orders favorites, then recents, then alphabetically', () => {
    const ranked = rankFoods(foods, '', [1, 5]).map((f) => f.id);
    expect(ranked).toEqual([5, 3, 1, 2, 4]);
  });

  it('sorts alphabetically ignoring accents', () => {
    const ranked = rankFoods(foods, '', []).map((f) => f.id);
    expect(ranked).toEqual([5, 3, 2, 4, 1]);
  });

  it('filters by name and brand, accent-insensitive', () => {
    expect(rankFoods(foods, 'ecreme', []).map((f) => f.id)).toEqual([4]);
    expect(rankFoods(foods, 'lactel', []).map((f) => f.id)).toEqual([4]);
    expect(rankFoods(foods, 'zzz', [])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const copy = [...foods];
    rankFoods(foods, '', [2]);
    expect(foods).toEqual(copy);
  });
});

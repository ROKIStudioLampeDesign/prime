import { describe, expect, it, vi } from 'vitest';
import { lookupBarcode } from './openFoodFacts';

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

describe('lookupBarcode', () => {
  it('requests only the needed fields and maps a found product', async () => {
    const fetchImpl = vi.fn(() =>
      json({ status: 1, product: { product_name: 'Nutella', nutriments: { 'energy-kcal_100g': 539 } } }),
    );
    const result = await lookupBarcode('3017620422003', { fetchImpl, online: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://world.openfoodfacts.org/api/v2/product/3017620422003.json?fields=product_name,brands,image_front_url,nutriments',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toMatchObject({ status: 'found', draft: { name: 'Nutella', per100g: { kcal: 539 } } });
  });

  it('reports not found (404 or status 0)', async () => {
    expect(await lookupBarcode('1', { fetchImpl: () => json({ status: 0 }, 404), online: true })).toEqual({
      status: 'notFound',
    });
    expect(await lookupBarcode('1', { fetchImpl: () => json({ status: 0 }), online: true })).toEqual({
      status: 'notFound',
    });
  });

  it('reports offline without calling the network', async () => {
    const fetchImpl = vi.fn();
    expect(await lookupBarcode('1', { fetchImpl, online: false })).toEqual({ status: 'offline' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports a timeout when the request is too slow', async () => {
    const hanging = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
      );
    expect(
      await lookupBarcode('1', { fetchImpl: hanging as typeof fetch, online: true, timeoutMs: 10 }),
    ).toEqual({
      status: 'timeout',
    });
  });

  it('reports server and network errors', async () => {
    expect(await lookupBarcode('1', { fetchImpl: () => json({}, 503), online: true })).toEqual({
      status: 'error',
    });
    expect(
      await lookupBarcode('1', {
        fetchImpl: () => Promise.reject(new TypeError('Failed to fetch')),
        online: true,
      }),
    ).toEqual({ status: 'error' });
  });
});

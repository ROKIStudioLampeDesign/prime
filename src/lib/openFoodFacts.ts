import { mapOffProduct, OFF_FIELDS, type OffProductDraft } from '../domain/openFoodFacts';
import { resizeImage } from './image';

/** The only network dependency of the app (optional): Open Food Facts product lookups. */
const API = 'https://world.openfoodfacts.org/api/v2/product';
export const LOOKUP_TIMEOUT_MS = 8000;
const IMAGE_TIMEOUT_MS = 10000;

export type LookupResult =
  | { status: 'found'; draft: OffProductDraft }
  | { status: 'notFound' }
  | { status: 'offline' }
  | { status: 'timeout' }
  | { status: 'error' };

async function fetchWithTimeout(url: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Looks a barcode up on Open Food Facts. Never throws: failures are reported as a status. */
export async function lookupBarcode(
  barcode: string,
  options: { fetchImpl?: typeof fetch; online?: boolean; timeoutMs?: number } = {},
): Promise<LookupResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  if ((options.online ?? navigator.onLine) === false) return { status: 'offline' };
  try {
    const response = await fetchWithTimeout(
      `${API}/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`,
      options.timeoutMs ?? LOOKUP_TIMEOUT_MS,
      fetchImpl,
    );
    // OFF answers 404 with a JSON body ({ status: 0 }) for unknown products.
    if (response.status === 404) return { status: 'notFound' };
    if (!response.ok) return { status: 'error' };
    const draft = mapOffProduct(await response.json());
    return draft ? { status: 'found', draft } : { status: 'notFound' };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return { status: 'timeout' };
    // A failed fetch is a TypeError; when the device just went offline, say so.
    return (options.online ?? navigator.onLine) === false ? { status: 'offline' } : { status: 'error' };
  }
}

/** Downloads a product photo and compresses it like user photos. Undefined on any failure. */
export async function downloadProductImage(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Blob | undefined> {
  try {
    const response = await fetchWithTimeout(url, IMAGE_TIMEOUT_MS, fetchImpl);
    if (!response.ok) return undefined;
    return await resizeImage(await response.blob());
  } catch {
    return undefined;
  }
}

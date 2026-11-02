/**
 * Asks the browser to keep our IndexedDB data out of automatic eviction.
 * Safari grants it more readily once the app is added to the home screen.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

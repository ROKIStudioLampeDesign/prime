export function Loading() {
  return (
    <div role="status" aria-live="polite" className="mt-6 flex justify-center py-10">
      <span className="size-6 animate-spin rounded-full border-2 border-line border-t-accent" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

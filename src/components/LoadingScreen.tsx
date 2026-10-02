/**
 * Shared loading state for pages that read from IndexedDB. Announces itself to
 * screen readers instead of showing a bare spinner.
 */
export function LoadingScreen() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}

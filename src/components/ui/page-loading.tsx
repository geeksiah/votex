// Shown the moment a page starts loading: a thin bar across the top so every tap gets instant feedback.
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden bg-transparent">
      <span className="sr-only">Loading</span>
      <span className="block h-full w-1/3 animate-[vx-loading_1s_ease-in-out_infinite] bg-fg motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40" />
    </div>
  );
}

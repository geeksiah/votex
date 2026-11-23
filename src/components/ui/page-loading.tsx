// Figma "Page loading bar": a 3px bar across the top while a page or step loads. It only shows when loading
// takes longer than 0.2 seconds, so quick pages do not flicker. Screen readers hear "Loading".
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden">
      <span className="sr-only">Loading</span>
      <span className="block h-full w-[35%] bg-primary opacity-0 animate-[vx-loading_1.1s_ease-in-out_0.2s_infinite] motion-reduce:w-full motion-reduce:animate-[vx-fade-in_0s_0.2s_forwards] motion-reduce:opacity-0" />
    </div>
  );
}

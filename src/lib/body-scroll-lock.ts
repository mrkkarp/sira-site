/**
 * Freeze the page behind an overlay, and hand back the release function.
 *
 * `document.body.style.overflow = "hidden"` is already this codebase's
 * scroll-lock signal rather than an implementation detail: `SmoothWheelScroll`
 * explicitly bails out when it sees that exact value
 * (`smooth-wheel-scroll.tsx`), so an overlay that *doesn't* set it doesn't
 * merely allow a stray scroll — it leaves the smooth-scroll driver actively
 * animating the page underneath a modal. This keeps that contract and only
 * adds the bookkeeping around it.
 *
 * Reference-counted because overlays here can legitimately overlap: the mobile
 * menu contains the control that opens the search drawer, so for a moment both
 * are mounted. With a plain set/clear pair the *first* one to close restores
 * scrolling while the second is still up. Counting means the page unfreezes
 * when the last overlay closes, and the original `overflow` value (not a
 * hardcoded `""`) is what gets restored.
 *
 * The returned function is idempotent — React can invoke an effect cleanup
 * more than once, and a double release would decrement the count twice and
 * unlock the page out from under an overlay that is still open.
 */
let lockCount = 0;
let overflowBeforeFirstLock = "";

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (lockCount === 0) {
    overflowBeforeFirstLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;

  let released = false;
  return function releaseBodyScroll() {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0) {
      document.body.style.overflow = overflowBeforeFirstLock;
    }
  };
}

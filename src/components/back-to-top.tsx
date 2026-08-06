"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { useCookieBannerUndecided } from "@/lib/use-cookie-banner";

/**
 * Appears only after the visitor has scrolled a meaningful distance (past
 * ~1.5 viewport heights) — not shown on short pages where it wouldn't add
 * value. Scroll behaviour respects `prefers-reduced-motion` via the global
 * rule in globals.css (which forces `scroll-behavior: auto`).
 *
 * Also stands down while the cookie banner is undecided. The banner is
 * `z-[45]` and spans the full bottom edge; this button was `z-40` in the
 * same corner, so it rendered *underneath* the banner and every click
 * landed on the banner instead. It looked enabled and did nothing — worse
 * than being absent. `MobileStickyCta` already yielded the bottom edge the
 * same way; this one had simply been missed.
 *
 * The inverted colours come from `variant="solid"`, not from `className`.
 * Passing `bg-text text-background` here looked like it worked and did not:
 * `cn` does no conflict resolution, so `text-background` lost to the
 * `text-text` in `IconButton`'s own base and the arrow was stroked black on
 * the black square. On a phone the result was a blank dark block that
 * appeared out of nowhere once you scrolled past 1.5 screens — on every page,
 * which is exactly how it was reported.
 */
export function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  const cookieBannerUndecided = useCookieBannerUndecided();

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 1.5);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible || cookieBannerUndecided) return null;

  return (
    <IconButton
      aria-label={label}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      variant="solid"
      className="fixed right-(--space-sm) bottom-(--space-sm) z-40"
      icon={
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path
            d="M12 19V5M5 12l7-7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      }
    />
  );
}

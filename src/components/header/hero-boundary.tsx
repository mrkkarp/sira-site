"use client";

import { useEffect } from "react";

/**
 * Marks the bottom edge of a page's dark hero. Render this once, right at
 * the end of a hero `Section` (`tone="dark"`), on any page that wants the
 * header to render transparent + light-text while the hero is in view and
 * solid once scrolled past. `Header` watches `#hero-boundary` via
 * IntersectionObserver; pages that don't render this always get the solid
 * header.
 *
 * Also flags `<body data-has-hero>` so `globals.css` can zero out the page's
 * top padding for that route — the hero is expected to reserve its own
 * clearance under the fixed header (see `--header-stack-height`).
 */
export function HeroBoundary() {
  useEffect(() => {
    document.body.dataset.hasHero = "true";
    return () => {
      delete document.body.dataset.hasHero;
    };
  }, []);

  return <div id="hero-boundary" aria-hidden="true" className="h-px w-full" />;
}

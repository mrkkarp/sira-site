"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";

/**
 * Appears only after the visitor has scrolled a meaningful distance (past
 * ~1.5 viewport heights) — not shown on short pages where it wouldn't add
 * value. Scroll behaviour respects `prefers-reduced-motion` via the global
 * rule in globals.css (which forces `scroll-behavior: auto`).
 */
export function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 1.5);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <IconButton
      aria-label={label}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="bg-text text-background hover:bg-graphite fixed right-(--space-sm) bottom-(--space-sm) z-40 shadow-none"
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

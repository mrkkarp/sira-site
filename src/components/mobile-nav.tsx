"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export function MobileNav({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((value) => !value)}
        className="text-ink text-sm"
      >
        {label}
      </button>
      {open ? (
        <div
          id="mobile-nav-panel"
          className="border-line bg-surface absolute inset-x-0 top-full border-t px-6 py-6"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

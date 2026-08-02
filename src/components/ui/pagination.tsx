import Link from "next/link";
import { cn } from "@/lib/cn";

const endClass =
  "type-nav px-(--space-2xs) py-(--space-3xs) transition-colors duration-(--duration-fast)";

/**
 * Every label is a required prop, with no English default. The previous
 * version hardcoded "Prev"/"Next" in the markup and defaulted the landmark
 * name to "Pagination", so the only translated pagination string in the
 * dictionary (`shop.pagination`) went unused and every locale — including
 * the Ukrainian default — shipped English controls. Requiring the props
 * means a new call site cannot quietly do the same again.
 *
 * The disabled end is a `<span>`, not a dimmed `<Link>`. `pointer-events-none`
 * only stops the mouse: the anchor stayed in the tab order and Enter still
 * navigated, so "Prev" on page 1 announced itself as disabled and then
 * reloaded page 1 anyway. A span is honest — nothing to focus, nothing to
 * activate (WCAG 4.1.2).
 */
export function Pagination({
  currentPage,
  totalPages,
  getHref,
  label,
  prevLabel,
  nextLabel,
}: {
  currentPage: number;
  totalPages: number;
  getHref: (page: number) => string;
  /** Names the `<nav>` landmark, so several paginations stay distinguishable. */
  label: string;
  prevLabel: string;
  nextLabel: string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const atStart = currentPage === 1;
  const atEnd = currentPage === totalPages;

  return (
    <nav aria-label={label} className="flex items-center gap-(--space-2xs)">
      {atStart ? (
        <span aria-hidden="true" className={cn(endClass, "opacity-40")}>
          {prevLabel}
        </span>
      ) : (
        <Link
          href={getHref(currentPage - 1)}
          rel="prev"
          className={cn(endClass, "text-text-muted hover:text-text")}
        >
          {prevLabel}
        </Link>
      )}
      <ul className="flex items-center gap-(--space-3xs)">
        {pages.map((page) => (
          <li key={page}>
            <Link
              href={getHref(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "type-nav flex h-9 w-9 items-center justify-center transition-colors duration-(--duration-fast)",
                page === currentPage
                  ? "bg-text text-background"
                  : "text-text-muted hover:text-text",
              )}
            >
              {page}
            </Link>
          </li>
        ))}
      </ul>
      {atEnd ? (
        <span aria-hidden="true" className={cn(endClass, "opacity-40")}>
          {nextLabel}
        </span>
      ) : (
        <Link
          href={getHref(currentPage + 1)}
          rel="next"
          className={cn(endClass, "text-text-muted hover:text-text")}
        >
          {nextLabel}
        </Link>
      )}
    </nav>
  );
}

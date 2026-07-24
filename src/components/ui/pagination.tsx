import Link from "next/link";
import { cn } from "@/lib/cn";

export function Pagination({
  currentPage,
  totalPages,
  getHref,
  label = "Pagination",
}: {
  currentPage: number;
  totalPages: number;
  getHref: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label={label} className="flex items-center gap-(--space-2xs)">
      <Link
        href={getHref(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className={cn(
          "type-nav text-text-muted hover:text-text px-(--space-2xs) py-(--space-3xs) transition-colors duration-(--duration-fast)",
          currentPage === 1 && "pointer-events-none opacity-40",
        )}
      >
        Prev
      </Link>
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
      <Link
        href={getHref(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className={cn(
          "type-nav text-text-muted hover:text-text px-(--space-2xs) py-(--space-3xs) transition-colors duration-(--duration-fast)",
          currentPage === totalPages && "pointer-events-none opacity-40",
        )}
      >
        Next
      </Link>
    </nav>
  );
}

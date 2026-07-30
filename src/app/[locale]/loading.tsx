import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic route-level loading skeleton — Server Component per Next.js
 * convention, wraps `page.tsx`/nested `layout.tsx` in a Suspense boundary
 * automatically. Deliberately generic (no page-specific shape) since most
 * routes here are still placeholder content; replace with a page-specific
 * skeleton once real layouts exist for a given route.
 *
 * The wrapper is `min-h-screen` on purpose: the layout renders the shared
 * `<Footer>` immediately after this fallback (`<main class="flex-1">` plus a
 * sticky footer). A short fallback would let the footer jump up under the
 * header for the fetch duration on every navigation (the "footer flash").
 * Filling the viewport keeps the footer below the fold, so a transition reads
 * as a page loading in place rather than a collapsed, broken layout.
 */
export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-3xl flex-col gap-(--space-sm) px-6 py-24">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-(--space-md) h-64 w-full" />
      </div>
    </div>
  );
}

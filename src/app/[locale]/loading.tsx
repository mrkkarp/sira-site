import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic route-level loading skeleton — Server Component per Next.js
 * convention, wraps `page.tsx`/nested `layout.tsx` in a Suspense boundary
 * automatically. Deliberately generic (no page-specific shape) since most
 * routes here are still placeholder content; replace with a page-specific
 * skeleton once real layouts exist for a given route.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-(--space-sm) px-6 py-24">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

/**
 * Standard "skip to content" link — visually hidden until focused, first
 * focusable element in the document. Targets `#main-content` on `<main>`
 * in `src/app/[locale]/layout.tsx`.
 */
export function SkipToContent({ label }: { label: string }) {
  return (
    <a
      href="#main-content"
      className="bg-text text-background type-nav focus-visible:outline-focus sr-only px-(--space-sm) py-(--space-2xs) focus:not-sr-only focus:absolute focus:top-(--space-2xs) focus:left-(--space-2xs) focus:z-[100]"
    >
      {label}
    </a>
  );
}

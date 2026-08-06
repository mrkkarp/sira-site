import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The small letterspaced label that sits above a section's heading, in the
 * brand's colour.
 *
 * ## Why this exists after all
 *
 * The first pass of the brand work refused this component — `index.ts` still
 * carries the table, and the row read: *`BrandSectionLabel` → `SectionHeader`'s
 * eyebrow already does this job.* That was true and it was the wrong
 * conclusion, for a reason worth writing down.
 *
 * Every accent that pass shipped was a **hover** state. Individually each was
 * defensible; together they meant the site at rest — which is the site people
 * actually look at — was exactly as monochrome as before. The brand was
 * present only for the element under the cursor, one at a time. "Something
 * already does this job" is only an argument against a new component if the
 * thing that already does the job is *doing it in the brand's voice*, and a
 * grey eyebrow is not.
 *
 * ## Why the eyebrow specifically
 *
 * It is the most-repeated small element on the site — roughly twenty of them
 * across the homepage, category pages, product pages, contact, 404 and the
 * error boundaries — and it is the one piece of type that is already *not*
 * content. It labels. Nobody reads an eyebrow for information they could not
 * get from the heading two lines below, which is precisely why colouring it
 * costs nothing: it is decoration that was already sitting in the layout,
 * already sized, already positioned. Colour lands in twenty places at rest for
 * zero new marks and zero new space.
 *
 * That is also the answer to "why not colour the headings" — a heading *is*
 * content. Terracotta display type would be a brand landing page, which the
 * brief forbids in as many words.
 *
 * ## Why it was worth extracting even ignoring the colour
 *
 * `type-eyebrow text-text-muted` was written out by hand in twenty-odd files.
 * `SectionHeader` held ten of them; the rest were loose. Recolouring by
 * find-and-replace across twenty call sites is how a design system acquires
 * nineteen consistent labels and one that got missed.
 *
 * ## Tones
 *
 * - `light` (default) — `--brand-accent-ink`, 4.78–5.85:1 on the three light
 *   surfaces. The eyebrow is ~11px, so it is *text*, and it is gated at
 *   1.4.3's 4.5:1, not 1.4.11's 3:1. `--brand-accent` itself would have been
 *   3.53:1 here and is not allowed anywhere near this component.
 * - `dark` — `--brand-accent-on-dark`, 5.75:1 on `--color-footer`. The ink
 *   collapses to 2.65:1 on that band; it is a light-surface colour and
 *   nothing else.
 *
 * Not `aria-hidden`, unlike the rest of this module: an eyebrow is real text
 * that a screen reader should read, and the colour is not carrying any state.
 */
export function BrandEyebrow({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "type-eyebrow",
        tone === "dark" ? "text-brand-accent-on-dark" : "text-brand-accent-ink",
        className,
      )}
    >
      {children}
    </p>
  );
}

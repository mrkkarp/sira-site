/**
 * The same skeleton as `[slug]/loading.tsx`, one segment higher.
 *
 * ## Why it has to exist twice
 *
 * `/` and `/products/<slug>` share only the `[locale]` layout, so a tap on a
 * product card mounts *two* new segments: `products` and `[slug]`. Until this
 * file existed, `products` had no loading boundary of its own, so the nearest
 * one above it — the generic article-shaped skeleton at
 * `src/app/[locale]/loading.tsx` — is what the router had to show first, and
 * the product skeleton only took over once the inner segment arrived.
 *
 * Recorded per frame on a throttled iPhone profile, that read as two different
 * pages before the real one:
 *
 * ```
 *   t=497ms   5 skeletons, document 2406px   ← [locale]/loading.tsx
 *   t=607ms  31 skeletons, document 2931px   ← [slug]/loading.tsx
 *   t=934ms   0 skeletons, document 6055px   ← the product page
 * ```
 *
 * A narrow centred column becoming a full-width two-column grid becoming the
 * page, in under half a second. `[slug]/loading.tsx` was written to stop
 * exactly that mismatch and could not, because it is mounted too late to be
 * the first thing shown. This file is the same skeleton at the segment the
 * router actually reaches first, which collapses the first two rows above into
 * one.
 *
 * It is a re-export rather than a copy so the two can never drift; the
 * reasoning for the skeleton's shape lives with the markup, in `[slug]`. Both
 * are kept: a boundary here alone would work for this navigation, but the one
 * in `[slug]` is what catches a move between two products, and duplicating the
 * boundary costs nothing when both render the same thing — there is no visible
 * stage change when the inner one takes over.
 *
 * There is no `page.tsx` in this folder, so nothing else uses it: `/products`
 * itself is not a route.
 */
export { default } from "./[slug]/loading";

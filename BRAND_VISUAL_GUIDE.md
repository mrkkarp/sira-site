# ODUDLAB — Brand Visual Guide

This is an **original** visual language for ODUDLAB, informed by the editorial,
gallery-like rhythm of premium architectural-material and object-design
brands. No copy, imagery, code, product names, or specific layouts from any
reference brand are reused anywhere in this project — only the general
character (restraint, material honesty, editorial/production contrast) is
interpreted here for ODUDLAB specifically.

## 1. Character

Two visual modes, alternating, **on one shared design system** — never a
separate "pretty shop" and a separate "gritty blog":

**A. Editorial premium** — large photography, generous air, big serif
headlines, minimal chrome, clean interiors, product-only frames. Used for
collections, projects, hero moments.

**B. Production mode** — real workshop, casting/grinding/painting/packing,
hands and tools without staged "craft cliché," industrial setting, natural
shadow, raw texture, large-scale crops, light text over a darker/complex
photo. Used for process storytelling and the footer (see §2.4).

Visual DNA to keep reinforcing: monolithic form, honest material texture,
visible physical weight, geometric/sculptural silhouettes, colour as a
property of the concrete itself (not a decorative sticker), industrial ×
precision contrast, warm cream/grey neutrals against pink/terracotta/olive/
blue-grey/graphite products.

**Hard no's:** excess border-radius, big decorative shadows, glass/blur
effects, random gradients, one flat beige "Scandi" wash across every page,
acid colours, corporate blue as the brand colour, one Instagram filter
applied to every photo.

## 2. Colour

Defined as CSS custom properties in `src/app/globals.css`, exposed to
Tailwind v4 via the `@theme inline` block (no `tailwind.config.*` in this
project — Tailwind v4 is CSS-first). Every token below is deliberately
**editable** — these are starting values per the brief, not fixed forever;
re-check contrast before changing them (see §8 Accessibility).

### 2.1 Neutral interface base — carries ~90% of every screen

| Token                   | Hex        | Use                                          |
| ----------------------- | ---------- | -------------------------------------------- |
| `--color-background`    | `#F1EEE7`  | Page background                              |
| `--color-surface`       | `#FAF9F5`  | Cards, dropdowns, inputs, raised surfaces    |
| `--color-surface-muted` | `#E7E2D9`  | Muted concrete-cream fills (skeletons, tags) |
| `--color-text`          | `#1D1D1B`  | Primary text, primary buttons                |
| `--color-text-muted`    | `#68655F`  | Secondary text, captions, resting nav        |
| `--color-border`        | `#D5CFC5`  | Hairline dividers                            |
| `--color-border-strong` | `#8A8579`² | Input borders, stronger separators           |
| `--color-footer`        | `#20201E`  | Dark graphite footer / production sections   |
| `--color-focus`         | `#2457D6`  | Accessible focus ring — never remove         |
| `--color-error`         | `#B3261E`  | Form errors, destructive state               |
| `--color-success`       | `#296B3D`¹ | Confirmations, in-stock badges               |

¹ Darkened from the brief's `#2E7D46` — that value contrasts `--color-background`
at only 4.38:1, below WCAG AA's 4.5:1 for normal text (see §9). `#296B3D`
gives 5.55:1.

² Darkened from the brief's `#9E9991` during the Prompt 9 accessibility audit
— that value only reached 2.44:1/2.69:1 against `--color-surface`/
`--color-background`, below WCAG 1.4.11's 3:1 non-text-contrast minimum for
this token's actual use (input/button/chip/swatch boundaries — the only
visible edge on those controls). `#8A8579` gives 3.17:1/3.49:1.

### 2.2 Material accents — the product's own colour, not UI decoration

| Token                     | Hex       | Name (uk)        |
| ------------------------- | --------- | ---------------- |
| `--color-concrete-light`  | `#C9C4BA` | Світлий бетон    |
| `--color-concrete-grey`   | `#9E9D98` | Сірий бетон      |
| `--color-graphite`        | `#343536` | Графіт           |
| `--color-dusty-pink`      | `#C99599` | Пудровий рожевий |
| `--color-terracotta`      | `#B85B42` | Теракота         |
| `--color-muted-olive`     | `#7B806B` | Оливковий        |
| `--color-industrial-blue` | `#5D7882` | Синьо-сірий      |
| `--color-warm-cream`      | `#D8D0B8` | Теплий кремовий  |

These hex values are **digital UI orientation points only** — never treat
them as proof of an exact concrete pigment or a RAL/NCS match. The real
product-colour model (`src/lib/schemas/colour.ts`, `ProductColour`) is a
separate, richer entity with its own `disclaimer` field precisely because of
this — see §2.5.

**Usage rule:** neutrals run the whole interface (backgrounds, text, nav,
forms, tables, most cards). Accents appear only in: campaign sections,
colour swatches, collection accents, selected/hover image states, a single
product backdrop, short info strips, transitions between editorial
sections. Never paint every button a different accent colour — primary CTAs
stay `--color-text` (dark) or `--color-background` (light); let the product
photo carry the colour, not the interface chrome.

### 2.3 Dark / "production mode" sections

`Section` component's `tone="dark"` (bg `--color-footer`, text
`--color-background`). Rules: one strong accent colour per section at most,
thin light-opacity borders (see `Footer`'s `border-white/10`), text
contrast controlled by real overlay only when placed over a photo — never
guess, check contrast at implementation time.

### 2.4 Product colour model (separate from the UI palette)

`src/lib/schemas/colour.ts` → `ProductColourSchema`: `slug`, `displayName`,
`digitalPreviewHex` (screen approximation only), `textureImage` (real cured-
sample photo, required before "final"), `ralOrNcsReference` (omit unless
actually confirmed), `textMode`, `availableCategories`,
`physicalSampleAvailable`, `disclaimer`, `demo`. Seed data lives in
`src/data/product-colours.json` — all six current entries are `demo: true`
because the specific hex↔pigment mapping hasn't been confirmed by the
workshop yet. Flip `demo` to `false` only once a real cured sample has been
photographed and the disclaimer text has been reviewed.

## 3. Typography

Two families, loaded via `next/font/google` in
`src/app/[locale]/layout.tsx` (and mirrored in
`src/app/design-system/layout.tsx` for the dev-only showcase):

- **Display / editorial — Instrument Serif** (`--font-editorial-serif`,
  `font-serif` utility / the `type-display-*` and `type-h1`/`type-h2`
  utilities below). Large scale only, normal weight, tight leading, small
  negative tracking, max 2–4 lines. Never for nav, forms, filters, specs, or
  long paragraphs. Never combine bold + italic.
- **Interface — Manrope** (`--font-interface-sans`, `font-sans` utility,
  the `body` default). Everything else: nav, body copy, buttons, forms,
  technical specs, prices.

### 3.1 Fluid type scale

Implemented as **custom Tailwind utilities** via the v4 `@utility` directive
in `globals.css` (prefixed `type-*`, not `text-*`, so they never collide
with Tailwind's own font-size utilities). Colour is intentionally **not**
baked into these classes — pair with a `text-*` colour utility explicitly
(e.g. `type-eyebrow text-text-muted`) so cascade order stays predictable.

| Utility                | Family    | Notes                                       |
| ---------------------- | --------- | ------------------------------------------- |
| `type-display-xl`      | serif     | `clamp(2.75rem, …, 6rem)`, tightest leading |
| `type-display-l`       | serif     | `clamp(2.25rem, …, 4rem)`                   |
| `type-h1`              | serif     | `clamp(1.875rem, …, 2.75rem)`               |
| `type-h2`              | serif     | `clamp(1.5rem, …, 2rem)`                    |
| `type-h3`              | sans, 600 | `clamp(1.25rem, …, 1.5rem)`                 |
| `type-h4`              | sans, 600 | `1.125rem`                                  |
| `type-body-lg`         | sans      | `1.125rem`                                  |
| `type-body`            | sans      | `1rem` (base)                               |
| `type-body-sm`         | sans      | `0.875rem`                                  |
| `type-label`           | sans, 500 | uppercase, `0.08em` tracking                |
| `type-eyebrow`         | sans, 500 | uppercase, `0.12em` tracking, smaller       |
| `type-caption`         | sans      | `0.75rem`                                   |
| `type-price`           | sans, 600 | tabular numerals                            |
| `type-nav`             | sans, 500 | `0.875rem`                                  |
| `type-technical-value` | sans, 600 | tabular numerals, for spec values           |
| `type-technical-label` | sans      | uppercase, spec labels                      |

Large headings use `clamp()` so they scale with viewport instead of jumping
at breakpoints, and never dominate the mobile viewport. Don't make every
page's H1 the same size for the same reason — vary `display-xl` vs `h1`
by page type (home/campaign vs. a standard content page).

**Composition rules:** one large serif moment per section (not one per
section repeated everywhere), never two different serif faces, never let a
heading overlap the product itself in a photo, never combine italic +
uppercase + outline text at once.

## 4. Layout

Components in `src/components/layout/`: `Container` (max width 1600px),
`FullBleed` (escape the container), `Section` (vertical rhythm + tone),
`Grid` (4/8/12 responsive columns), `Stack` / `Inline` (flex primitives with
spacing-scale gaps), `SectionHeader` (eyebrow + heading + optional action),
`EditorialLayout` (deliberately **asymmetric** media+text split — 7/4
columns, not 6/6), `MediaFrame` (named aspect ratios + caption/credit slot,
see `IMAGE_REQUIREMENTS.md` §7.5 for the ratio list).

- **No rounded corners, no drop shadows, no gradients, no glass effects** —
  `--radius-none` is the only radius token. The one accepted exception is
  the circular radio-button indicator (`RadioGroup`), which stays circular
  because that's the universally understood native control shape.
- Borders are hairline and separate, never decorate.
- Full-bleed sections are allowed for photography and dark production
  sections; don't use `FullBleed` for ordinary content blocks.

## 5. Spacing

Fluid scale in `globals.css` (`--space-3xs` through `--space-2xl`), static
at the small end (labels, inline gaps) and `clamp()`-based from `--space-md`
upward so section padding breathes on desktop and compresses — but never
disappears — on mobile.

## 6. Motion

Centralised tokens in `globals.css`: `--duration-fast` (120ms),
`--duration-normal` (220ms), `--duration-slow` (420ms), `--ease-standard`,
`--ease-entrance`, `--stagger-small` (60ms). Used via Tailwind's
CSS-variable-from-arbitrary-value syntax, e.g. `duration-(--duration-fast)`.

Allowed: soft opacity/colour transitions on hover, a small vertical
translate on entrance, underline reveal on links, drawer/modal open (see
`DialogPrimitive`), image scale on hover for product photos, sticky-header
transitions. **Not allowed:** parallax, infinite decorative loops, bounce,
button scale-on-press, scroll-jacking, animating every text line in.
`prefers-reduced-motion: reduce` is handled globally in `globals.css` — it
collapses all durations to ~0, so no per-component override is needed.

## 7. Buttons & links

`src/components/ui/button.tsx`: `primary-dark`, `primary-light`, `outline`,
`ghost` variants, rectangular, no geometry shift on hover (colour/background
only), visible `:focus-visible` ring everywhere (global rule in
`globals.css` using `--color-focus`), `disabled` drops opacity and disables
pointer events, `sm`/`md` sizes both meet a ~36–44px touch target.
`TextLink` adds a `variant="underlined"` editorial style (static underline,
darkens on hover) versus the default muted-to-solid hover link.

## 8. Photography

See `IMAGE_REQUIREMENTS.md` for the full brief (content mix, technical
ratios, alt-text policy, delivery/naming convention). No photography is
wired into any page yet in this stage — `MediaFrame` exists as the frame
components will render real images into once photography exists.

## 9. Accessibility checklist (re-run whenever tokens or components change)

- Body text (`--color-text` on `--color-background`/`--color-surface`) and
  muted text (`--color-text-muted`) must clear WCAG AA (4.5:1 body, 3:1
  large text) — re-verify after any hex change in §2.1.
- `:focus-visible` must stay visible on every interactive element — this is
  a global rule, don't add `outline-none` without replacing it.
- Every icon-only control (`IconButton`, `Swatch`) requires an explicit
  `aria-label` — enforced at the TypeScript prop level for `IconButton`.
- `Modal`/`Drawer` share `DialogPrimitive`: focus moves into the panel on
  open, `Tab`/`Shift+Tab` are trapped inside it, `Escape` closes it, and
  focus returns to the trigger on close.
- `Tabs` implements the WAI-ARIA APG pattern: roving `tabindex`,
  `ArrowLeft`/`ArrowRight`/`Home`/`End` move focus between tabs.

## 10. Component library

`src/components/ui/` (24 components, all typed, all with the accessibility
attributes noted above where relevant): `Button`, `LinkButton` (shares
`Button`'s base/variant/size classes, wraps `next/link` instead of a
`<button>`, no `"use client"` so it's safe in Server Components), `TextLink`,
`IconButton`, `Badge`, `Price`, `Divider`, `Breadcrumbs`, `Accordion`, `Tabs`,
`Drawer`, `Modal` (+ shared `DialogPrimitive`), `SearchField`, `Select`,
`Checkbox`, `RadioGroup`, `QuantitySelector`, `Swatch`, `Toast`/
`ToastProvider`, `Skeleton`, `EmptyState`, `FormField`, `Pagination`,
`VisuallyHidden`.

Live, interactive reference: **`/design-system`** (dev-only — the route's
own layout calls `notFound()` when `NODE_ENV === "production"`, and
`src/proxy.ts` excludes it from locale rewriting so it isn't mistaken for
public content).

## 11. i18n tone

uk (default), en, and pl copy stay in the same register: direct,
material-focused, no exclamation marks, no false urgency ("limited time",
"only 2 left"). See `src/i18n/dictionaries/*.json`.

## 12. Header stacking model

The header stack (`AnnouncementBar` + header bar, `src/components/header/header.tsx`)
is `position: sticky`, not `fixed`. This is deliberate — `sticky` avoids iOS
Safari's fixed-position quirks (viewport jumps on keyboard open, scroll
chaining bugs) and needs no compensating `padding-top` on ordinary pages,
since it still occupies its own space in normal flow.

Its real rendered height is measured (`ResizeObserver` + a direct
`getBoundingClientRect()` fallback) and written to the
`--header-stack-height` custom property on `<html>`; `globals.css` sets a
fallback value for the instant before that measurement runs.

A page that wants the "transparent header over a dark hero" effect renders
`<HeroBoundary />` (`src/components/header/hero-boundary.tsx`) at the end of
its hero section, and gives that section:

```css
margin-top: calc(-1 * var(--header-stack-height));
padding-top: var(--header-stack-height);
```

This pulls the hero's background up behind the transparent header (resolved
by z-index stacking, not by overlapping a fixed element) while keeping the
hero's actual content flush with where it would otherwise start. `Header`
watches `#hero-boundary` via `IntersectionObserver` (plus a direct rect
check on mount, for the same iOS/observer-timing reasons as the height
measurement above) and switches to `bg-transparent text-background` while
the boundary is below the fold. Scroll-direction hide/show
(`-translate-y-full`) never triggers near the top of the page, while any
overlay (mega-menu, search, mobile drawer) is open, or while focus is
inside the header.

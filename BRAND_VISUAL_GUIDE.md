# ODUDLAB — Brand Visual Guide

This is an **original** visual language for ODUDLAB, informed by the editorial,
gallery-like rhythm of premium architectural-material sites (the brief cites
noodco.com.au as a reference point). No copy, imagery, code, or product names
from that site are reused anywhere in this project — only the general feel
(generous whitespace, serif/sans contrast, restrained colour) is interpreted
here for ODUDLAB specifically.

## 1. Positioning

ODUDLAB is a working concrete studio, not a lifestyle-brand veneer over one.
The site should read as **premium but not precious**: it can show a form in
progress, a trowel mark, a pallet of cured sinks — alongside the clean
product and interior shots. Sterile-only product photography is explicitly
against the brief (see `IMAGE_REQUIREMENTS.md`).

## 2. Colour

Defined as CSS variables in `src/app/globals.css` (Tailwind v4, `@theme`
block — no `tailwind.config.js` in this project).

### Neutral base (do the heavy lifting — 90%+ of every screen)

| Token               | Hex       | Use                                  |
| ------------------- | --------- | ------------------------------------ |
| `--color-paper`     | `#F6F4F1` | Page background                      |
| `--color-surface`   | `#FFFFFF` | Cards, dropdowns, raised surfaces    |
| `--color-ink`       | `#211F1D` | Primary text, primary buttons        |
| `--color-ink-muted` | `#6E6A65` | Secondary text, captions, nav (rest) |
| `--color-line`      | `#DED9D2` | Borders, dividers — hairline only    |

### Accent range — used sparingly

These exist because concrete is coloured **in the mass**, not painted — each
one is a real, orderable pigment option, not a marketing palette. Use them
for colour swatches, small tags, and the occasional single accent detail.
**Never** as a large background fill, never in a gradient, never more than
one accent colour on screen at a time outside of the `/colours` swatch grid.

| Token                | Hex       | Name (uk)        |
| -------------------- | --------- | ---------------- |
| `--color-dusty-pink` | `#C8A6A1` | Пудровий рожевий |
| `--color-terracotta` | `#B5654A` | Теракота         |
| `--color-olive`      | `#767650` | Оливковий        |
| `--color-blue-grey`  | `#6D7C85` | Синьо-сірий      |
| `--color-graphite`   | `#47443F` | Графіт           |

## 3. Typography

Two families, defined via `next/font/google` in `src/app/[locale]/layout.tsx`:

- **Display / editorial — Fraunces** (`--font-editorial-serif`, `font-serif`
  utility). Used for H1/H2, pull quotes, the wordmark. Set loose leading,
  never bold-italic together.
- **Interface — Geist Sans** (`--font-geist-sans`, `font-sans` utility, also
  the `body` default). Used for everything else: nav, body copy, buttons,
  form fields, prices.

Rough scale (Tailwind utilities, not hard tokens yet — refine once real
pages are designed in a later stage):

- H1: `text-4xl sm:text-5xl font-serif`
- H2: `text-2xl sm:text-3xl font-serif`
- Eyebrow / label: `text-xs uppercase tracking-wide text-ink-muted`
- Body: `text-base` / `text-sm` for secondary copy

## 4. Layout rules

- Generous margins over decoration. When in doubt, add whitespace, not a
  border.
- **No rounded corners, no drop shadows, no gradients, no glassmorphism.**
  Concrete is a material with sharp cast edges — the UI should read the
  same way. `--radius-none` is the only radius token; do not add others
  without updating this guide first.
- Borders are hairline (`border-line`, 1px) and used to separate, not to
  decorate.
- Carousels are disallowed if they hurt mobile UX (per the technical brief).
  Prefer a scrollable row or a static grid.

## 5. Motion

- Keep it to opacity/colour transitions on hover and simple show/hide for
  disclosures (see `MobileNav`). No bounce, no parallax, no scroll-jacking.
- Respect `prefers-reduced-motion` — do not add a transition anywhere
  without checking it degrades gracefully (Tailwind's default
  `transition-opacity` etc. already respect this at the browser level for
  users with reduced motion enabled system-wide combined with our own
  restraint on _what_ animates).

## 6. Accent-colour usage examples

- A colour swatch tile on `/colours` or `/samples`.
- A single small tag/dot next to a product name to indicate an available
  custom-colour option.
- **Not** a hero background, **not** a button fill, **not** a section
  background.

## 7. i18n tone

uk (default), en, and pl copy should stay in the same register: direct,
material-focused, no exclamation marks, no false urgency ("limited time",
"only 2 left"). See `src/i18n/dictionaries/*.json`.

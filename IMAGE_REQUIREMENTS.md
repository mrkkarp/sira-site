# Image requirements

No photography is wired into the site yet — this stage (routing + design
system) intentionally ships without images so nobody mistakes a placeholder
for final content. This file specifies what the owner needs to shoot/supply
before image components are built in a later stage.

**Do not use Nood Co (or any other third-party) photography anywhere in this
project, including as a temporary placeholder.**

## General rules

- Real photographs only — no stock photography, no AI-generated renders
  standing in for real products.
- Mix documentary (workshop, process, hands-on-material) shots with clean
  product shots and real interior/urban installs. An all-white-background
  catalogue with nothing else is explicitly against the brief.
- Natural or soft studio light; avoid heavy colour-graded/filtered looks —
  the concrete's actual grey/pigment tone must read true.
- Deliver the largest resolution you have; the site will downsample. Never
  upscale a small source image to hit a minimum below.

## Categories needed

### 1. Home hero / editorial spreads

- Orientation: landscape, ideally shootable both as a wide crop (21:9) and a
  standard crop (16:9) from the same frame.
- Minimum: 2400 × 1350 px.
- Content: workshop/process or a striking single product in situ — not a
  generic "concrete texture" stock shot.

### 2. Product photography (per SKU)

- **Hero shot**: square, 1:1, minimum 2000 × 2000 px, neutral seamless
  background (paper or light studio grey — not pure white sweep).
- **Detail/texture crop**: square or 4:5, minimum 1600 px on the short edge —
  shows the actual cast surface, edge, or drain/mount detail.
- **In-situ shot**: at least one per product family (not necessarily every
  SKU), landscape, minimum 2000 px wide, showing the piece installed in a
  real or realistic setting.
- Every colour variant that ships (base grey vs. custom colour) should have
  at least the hero shot re-shot or colour-accurately represented — do not
  fake a colour variant by digitally recolouring a grey photo.

### 3. Workshop / process

- Orientation: flexible (3:2 or 4:3), minimum 2000 px on the long edge.
- Content: casting, formwork, hand-finishing, the actual people doing the
  work. This is what separates the brand from a generic product catalogue —
  do not skip this category.

### 4. Projects / installations

- Landscape, minimum 2400 px wide, real completed installs (residential,
  commercial, urban). Include at least one wide establishing shot and one
  detail shot per project.

### 5. Colour swatches (`/colours`, `/samples`)

- Square, minimum 800 × 800 px, **photographs of actual cured/tinted
  concrete samples** — not digital colour chips — so texture and true
  pigment are visible under consistent lighting across the whole set.

## Delivery format & naming

Until a CMS/asset pipeline exists, drop files under `public/images/` using:

```
public/images/products/<product-slug>/<index>-<hero|detail|in-situ>.jpg
public/images/workshop/<short-description>.jpg
public/images/projects/<project-slug>/<index>.jpg
public/images/colours/<colour-slug>.jpg
```

## Alt text

Every `<Image>` needs a real, descriptive `alt` — material + product name +
what's shown, e.g. `"ODUDLAB Odri concrete sink, floor-standing, graphite finish"`.
Never leave `alt=""` on a content image (decorative-only images are the only
exception, and there should be very few of those on this site).

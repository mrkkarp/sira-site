# Content checklist

Prompt 9 §7 (content audit). Full, page-by-page inventory of every route
under `src/app/[locale]/` — 28 routes total, verified directly against each
`page.tsx` (not inferred), current as of this audit.

**Correction to `README.md`:** the README currently states 4 placeholder
pages. The real count is **18**. §13 (documentation update) must fix this.

## Method

Every stub page in this codebase follows one, unambiguous convention:

- Renders the shared `<PlaceholderPage>` component (`src/components/placeholder-page.tsx`).
- Uses `buildPlaceholderMetadata()` (`src/lib/seo/placeholder-metadata.ts`) for
  its `generateMetadata`, which sets `robots: { index: false, follow: true }`.
- Shows the same two dictionary strings on every locale: `placeholder.title`
  ("Сторінка в розробці") and `placeholder.body` ("Цей розділ архітектурно
  закладений, наповнення з'явиться на наступному етапі").

`noindex` alone is **not** sufficient signal for "placeholder" — 4 of the 10
real-content routes (`/search`, `/cart`, `/checkout`, `/order-status`) are
also `noindex`, but for an unrelated, legitimate reason (they're
per-visitor/session utility pages, never a landing page worth ranking), via
`buildUtilityPageMetadata()` or an inlined equivalent — not
`buildPlaceholderMetadata()`. These are counted as real content below, not as
placeholders.

## Placeholder pages (18) — no real content yet

All use `PlaceholderPage` + `buildPlaceholderMetadata`, noindex, identical
generic copy. Ordered alphabetically by route.

| Route               | Notes                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/about`            | —                                                                                                                                                                        |
| `/care`             | —                                                                                                                                                                        |
| `/careers`          | —                                                                                                                                                                        |
| `/colours`          | Notable: real colour data already exists (`src/data/product-colours.ts`) and is used on the homepage/design-system page, but this dedicated route isn't wired to it yet. |
| `/contact`          | Contact details need owner confirmation before this can become real (Prompt 9's standing rule — never fabricate a phone/email/address).                                  |
| `/cookies-policy`   | Legal text needs owner/legal confirmation before this can become real.                                                                                                   |
| `/designers`        | —                                                                                                                                                                        |
| `/faq`              | Reference/calibration example for the placeholder convention.                                                                                                            |
| `/payment-delivery` | Payment/logistics details need owner confirmation before this can become real.                                                                                           |
| `/privacy-policy`   | Legal text needs owner/legal confirmation before this can become real.                                                                                                   |
| `/projects` (list)  | Notable: the homepage already has a real `ProjectsShowcase` section with real project data; this dedicated list route isn't wired to it yet.                             |
| `/projects/[slug]`  | Has its own code comment confirming no real per-project slugs/detail content exist yet.                                                                                  |
| `/public-offer`     | Legal text needs owner/legal confirmation before this can become real.                                                                                                   |
| `/resources`        | —                                                                                                                                                                        |
| `/returns`          | Returns policy needs owner confirmation before this can become real.                                                                                                     |
| `/samples`          | —                                                                                                                                                                        |
| `/stockists`        | Stockist list needs owner confirmation before this can become real.                                                                                                      |
| `/terms-of-use`     | Legal text needs owner/legal confirmation before this can become real.                                                                                                   |

## Real-content pages (10)

| Route                 | Indexable?     | Notes                                                                                                                                                                                       |
| --------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (homepage)        | Yes            | 13 real sections, incl. `ProjectsShowcase` (see `/projects` note above).                                                                                                                    |
| `/shop`               | Yes            | Real catalog listing.                                                                                                                                                                       |
| `/shop/[category]`    | Yes            | Real catalog listing, per category.                                                                                                                                                         |
| `/products/[slug]`    | Yes            | Real PDP.                                                                                                                                                                                   |
| `/collections`        | Yes            | Real collection listing.                                                                                                                                                                    |
| `/collections/[slug]` | Yes            | Real collection detail.                                                                                                                                                                     |
| `/warranty`           | Yes            | Real submission flow (Phase I) — its own code comment confirms it replaced an earlier `PlaceholderPage` stub; posts a `type: "warranty"` lead via `WarrantyRequestForm` to `/api/warranty`. |
| `/search`             | No (`noindex`) | Real, functional query-driven results page (shares `searchCatalog()` with `/api/search`); intentionally not indexed since results are per-query, not a landing page.                        |
| `/cart`               | No (`noindex`) | Real, functional; per-visitor state, intentionally not indexed (`buildUtilityPageMetadata`).                                                                                                |
| `/checkout`           | No (`noindex`) | Real, functional; per-visitor state, intentionally not indexed (`buildUtilityPageMetadata`).                                                                                                |
| `/order-status`       | No (`noindex`) | Real, functional; per-visitor state, intentionally not indexed (`buildUtilityPageMetadata`).                                                                                                |

## Totals

- 28 routes total (verified via `find src/app/[locale] -name page.tsx`).
- 18 placeholder (noindex, generic copy, no real content).
- 10 real-content (6 fully indexable, 4 real-but-intentionally-noindexed
  utility pages).

## Content still pending owner/legal confirmation

Per Prompt 9's standing constraint (never fabricate contact/financial/legal/
logistics content — owner confirmation required), the following placeholder
pages cannot be filled in without real, owner-supplied data or Horoshop
export data: `/contact`, `/payment-delivery`, `/returns`, `/stockists`,
`/cookies-policy`, `/privacy-policy`, `/public-offer`, `/terms-of-use`.

The remaining placeholders (`/about`, `/care`, `/careers`, `/colours`,
`/designers`, `/faq`, `/projects`, `/projects/[slug]`, `/resources`,
`/samples`) are editorial/marketing content, not contact/financial/legal
data, but still require real copy and imagery (see `IMAGE_REQUIREMENTS.md`)
rather than fabricated placeholder text — none has been invented here.

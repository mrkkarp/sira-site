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

## Placeholder pages (15) — no real content yet

All use `PlaceholderPage` + `buildPlaceholderMetadata`, noindex, identical
generic copy. Ordered alphabetically by route.

> **This table has not kept up with the site.** `/care`, `/colours`,
> `/contact`, `/designers`, `/faq`, `/payment-delivery`, `/returns` and
> `/samples` all have real content and are indexable now; they are still listed
> below. `/about` has been removed from it because that page was filled in the
> same change that added this note. Treat the rows as a to-do list to verify,
> not as truth — the authoritative answer is whether a route still renders
> `PlaceholderPage`.
>
> **The four legal routes are now drafted, not transcribed.** Neither the
> Horoshop export nor the archived pre-Horoshop WordPress site ever had
> `/cookies-policy`, `/privacy-policy`, `/public-offer` or `/terms-of-use`, so
> there was nothing to recover. On 2026-08-06 the owner asked for them to be
> written ("то напиши їх сам"), and they live in their own module,
> `src/content/legal-pages.ts`, deliberately NOT in `src/content/info-pages.ts`
> — that module's contract is "nothing here is invented", and these are drafted.
> They are grounded in the site's own verifiable behaviour (every data claim
> cites the file it was read off), in commercial terms already published on
> `/returns`, `/payment-delivery` and `/colours`, and in default Ukrainian law;
> they are NOT legal advice and should be reviewed by a lawyer. Three are live;
> `/public-offer` is written but withheld — see the row below.
>
> `/careers` and `/resources` still have no source, but are discretionary rather
> than legally required.

| Route               | Notes                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/care`             | —                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/careers`          | —                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/colours`          | FILLED. Real prose in `src/content/info-pages.ts` (uk), recovered from the archived WordPress colour + Terrazzo posts, plus a nine-shade illustrative palette in `src/content/colour-palette.ts`. That palette is deliberately kept OUT of `src/data/product-colours.json` (whose six entries are all still `demo: true`) — it is editorial imagery for one page, not a set of orderable finishes. |
| `/contact`          | Contact details need owner confirmation before this can become real (Prompt 9's standing rule — never fabricate a phone/email/address).                                                                                                                                                                                                                                                            |
| `/cookies-policy`   | FILLED. Drafted prose in `src/content/legal-pages.ts` (uk). Names the two real storage keys — `odudlab_cart` (60 days, HttpOnly, SameSite=Lax) and `odudlab:cookie-consent` — and states the Consent Mode v2 defaults read off `src/lib/analytics/consent-mode.ts`. If that code changes, this page is wrong and must change with it.                                                              |
| `/designers`        | —                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/faq`              | FILLED. Real prose in `src/content/info-pages.ts` (uk). Custom-order answer recovered from the archived WordPress post; the rest are one-paragraph answers that `link` to the full page rather than duplicating it.                                                                                                                                                                                |
| `/payment-delivery` | Payment/logistics details need owner confirmation before this can become real.                                                                                                                                                                                                                                                                                                                     |
| `/privacy-policy`   | FILLED. Drafted prose in `src/content/legal-pages.ts` (uk). The data inventory is enumerated field by field from the five lead routes' Zod schemas and `src/collections/{Leads,Orders}.ts`; §4 explains that Enhanced Conversions hash e-mail/phone with SHA-256 in the browser and never send plaintext (`src/lib/analytics/user-data.ts`). Same rule: code changes ⇒ this page changes.          |
| `/public-offer`     | WRITTEN BUT WITHHELD. Full offer text exists in `src/content/legal-pages.ts`, gated on `legalEntity` in `src/config/legal.ts`, which is `null`. An offer that names no seller must not be published (ст. 7 ЗУ «Про електронну комерцію»). STILL NEEDED FROM OWNER: legal form + registered name (ФОП/ТОВ), ЄДРПОУ or ІПН, registered address, VAT status. Fill those in and the route goes live.   |
| `/resources`        | —                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/returns`          | Returns policy needs owner confirmation before this can become real.                                                                                                                                                                                                                                                                                                                               |
| `/samples`          | —                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/stockists`        | Stockist list needs owner confirmation before this can become real.                                                                                                                                                                                                                                                                                                                                |
| `/terms-of-use`     | FILLED. Drafted prose in `src/content/legal-pages.ts` (uk). Its §5 is the only section aware of the offer's gate: while `legalEntity` is `null` it neither cites nor links `/public-offer`, and points at `/payment-delivery` instead.                                                                                                                                                             |

## Real-content pages (13)

| Route                 | Indexable?     | Notes                                                                                                                                                                                       |
| --------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (homepage)        | Yes            | 13 real sections, incl. `ProjectsShowcase`, which now reads the real project registry (`src/content/projects.ts`).                                                                          |
| `/projects`           | Yes            | Real case-study index, driven by `src/content/projects.ts`; one published project today. Was a `PlaceholderPage` until that registry existed.                                               |
| `/projects/[slug]`    | Yes            | Real case study: cover photo, fact sheet, narrative, gallery, catalogue links, `CreativeWork` + `BreadcrumbList` JSON-LD. Prerendered per slug via `generateStaticParams`.                  |
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

- 29 route files total (verified via `find src/app/[locale] -name page.tsx`).
- 15 rows in the placeholder table, 13 in the real-content table (9 fully
  indexable, 4 real-but-intentionally-noindexed utility pages).
- These two counts do not reconcile to 29, and deliberately are not forced to:
  per the caveat above, several routes listed as placeholders have since been
  filled in, and a few `PlaceholderPage` imports survive only as a
  locale-fallback branch inside an otherwise real page. The authoritative
  answer for any single route is what it actually renders — not this table.

## Content still pending owner/legal confirmation

Per Prompt 9's standing constraint (never fabricate contact/financial/legal/
logistics content — owner confirmation required), the following placeholder
pages cannot be filled in without real, owner-supplied data or Horoshop
export data: `/contact`, `/payment-delivery`, `/returns`, `/stockists`.

The legal pages have since been dealt with without breaking that rule rather
than in spite of it. `/privacy-policy`, `/cookies-policy` and `/terms-of-use`
describe how this site already demonstrably behaves — no fact in them was
invented, and each claim's source file is cited in the header comment of
`src/content/legal-pages.ts`. The one input that genuinely could not be
derived from anything — who the seller legally is — was isolated in
`src/config/legal.ts` as `null` rather than guessed, and it gates
`/public-offer` alone. **Outstanding owner input: legal form and registered
name (ФОП/ТОВ), ЄДРПОУ or ІПН, registered address, VAT status.** All four
pages are drafts, not legal advice, and warrant a lawyer's review.

The remaining placeholders (`/careers`, `/resources`) are editorial/marketing
content, not contact/financial/legal data, but still require real copy and
imagery (see `IMAGE_REQUIREMENTS.md`) rather than fabricated placeholder text —
none has been invented here.

One commercial detail is pending owner confirmation specifically: the archived
2016-2019 posts quoted surcharges of +20% for pigment in the mass, +15% for a
RAL-exact surface treatment and +100% for Terrazzo. `/colours` and `/faq`
describe these qualitatively ("дорожче") on purpose. Restore the numbers only
once the owner confirms they are still current — and note the +15% priced a
service that no longer exists (see below), so that one is dead regardless.

The owner has since (2026-08-06) confirmed the _shape_ of the colour-price
answer without supplying a number: custom pieces are quoted individually, and
serial pieces already carry the mechanism on the product page ("Стандартний
колір" at no surcharge vs. "Уточнити індивідуальний колір"). `/colours` →
"Скільки коштує колір" says exactly that and still states no percentage.

The archive is also outdated on one factual point, corrected by the owner on
2026-08-06: the RAL post describes tinting the protective lacquer as a separate
"поверхневе фарбування". The workshop no longer does surface painting. An exact
RAL is now achieved by adding pigments to the two-component polyurethane
coating itself. `/colours`, `/faq` and `/care` were all updated to match and
must stay consistent — do not regenerate them from the archive.

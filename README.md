# ODUDLAB — site

Premium ecommerce/editorial site for ODUDLAB, an architectural-concrete
studio. Rebuilt on Next.js after outgrowing a Horoshop-based storefront and,
before that, a static HTML demo.

**Status: full build-out complete (Phases A–J).** Domain model, Payload CMS
admin, product catalogue (imported from the real Horoshop export), a
server-persisted cart, lead/contact forms with email notifications,
checkout with LiqPay online payment, an order-status lookup, catalogue
search, a warranty claim flow with photo upload, and a hardening pass
(CSRF/rate-limit guards, security headers) are all built and tested. See
[Known gaps / deliberately deferred](#known-gaps--deliberately-deferred)
for what's intentionally not built yet.

## Stack

- Next.js 16 (App Router, Turbopack, Server Components by default)
- TypeScript (strict)
- Payload CMS 3 (Postgres) — admin UI at `/admin`, backs the domain
  collections listed below
- Tailwind CSS v4 (CSS-first config — see `src/app/globals.css`, no
  `tailwind.config.*` file)
- Zod for data validation (domain schemas + request/response schemas)
- LiqPay for online card payment (adapter-isolated — see
  `src/lib/payments/liqpay-adapter.ts`)
- Resend-based email adapter for lead notifications (falls back to console
  logging if unconfigured — see `src/lib/email/lead-notification-adapter.ts`)
- Vitest for unit/integration tests, Playwright for e2e
- ESLint + Prettier (with `prettier-plugin-tailwindcss`)

## Getting started

```
npm install
```

Copy `.env.example` to `.env.local` and fill in at least `DATABASE_URL` and
`PAYLOAD_SECRET` (a local Postgres instance is required — Payload needs it
even in dev). Everything under "Optional" in `.env.example` can stay unset;
the app degrades gracefully (email sends fall back to console logs, S3
uploads fall back to local disk, LiqPay/Shopify/Telegram integrations are
simply inactive).

```
npm run dev
```

Open http://localhost:3000 for the storefront, http://localhost:3000/admin
for the Payload admin panel (first run prompts you to create an admin
user).

## Scripts

| Command                         | What it does                                                        |
| ------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                   | Dev server (Turbopack)                                              |
| `npm run build`                 | Production build + typecheck                                        |
| `npm start`                     | Serve the production build                                          |
| `npm run lint`                  | ESLint                                                              |
| `npm run typecheck`             | `tsc --noEmit`                                                      |
| `npm test`                      | Vitest, single run                                                  |
| `npm run test:watch`            | Vitest, watch mode                                                  |
| `npm run test:e2e`              | Playwright (run `npx playwright install` once first)                |
| `npm run format`                | Prettier, write                                                     |
| `npm run format:check`          | Prettier, check only                                                |
| `npm run payload`               | Payload CLI (migrations, etc.)                                      |
| `npm run import:horoshop`       | Dry-run the Horoshop catalogue importer (no writes)                 |
| `npm run import:horoshop:live`  | Run the importer for real, writing to Payload's Products/Categories |
| `npm run seed:legacy-redirects` | Seed the static legacy-URL → new-URL redirect rows (idempotent)     |

## Architecture

The domain is deliberately layered so business rules don't depend on
Payload (or any specific persistence) directly:

- **`src/domain/`** — pure TypeScript + Zod types with no framework
  dependencies: `catalog` (product/variant/colour/category/material),
  `ecommerce` (cart/order/payment/promo-code), `leads` (quote/callback/
  contact/designer/sample/warranty requests), `content` (page/article/faq/
  project/stockist/navigation), `import` (Horoshop import batch/warning
  tracking), `shared` (money, measurement, lead-time, IDs, SEO, legacy
  metadata carried over from Horoshop).
- **`src/repositories/`** — an interface per domain aggregate (e.g.
  `product-repository.ts`) plus a Payload-backed implementation
  (`*.payload.ts`) that maps Payload documents to/from domain types. A
  `product-repository.horoshop-snapshot.ts` also exists as a read-only
  fallback over the static JSON export — see `src/data/`.
- **`src/services/`** — orchestration that depends on repository
  interfaces, not Payload: `product-service`, `cart-service`,
  `order-service`, `horoshop-import-service`.
- **`src/collections/`** — Payload collection configs (`Products`,
  `Categories`, `Colours`, `Carts`, `Orders`, `Payments`, `Leads`, `Media`,
  `Documents`, `Pages`, `Redirects`, `Users`, `ImportBatches`,
  `ImportWarnings`).
- **`src/app/api/`** — route handlers. Every public mutation route
  (`/api/cart*`, `/api/checkout`, `/api/callback`, `/api/quote`,
  `/api/newsletter`, `/api/warranty*`, `/api/order-status`) follows the
  same guard pattern: same-origin check → rate limit → validate body →
  business logic → generic error response (`detail` only in
  `NODE_ENV=development`). See `src/lib/forms/verify-same-origin.ts` and
  `src/lib/forms/rate-limit.ts`.
- **`src/lib/forms/`** — shared hardening/utility building blocks:
  honeypot spam check, same-origin verification, in-memory rate limiter
  (self-pruning, single-process), lead-submission structured logging
  (no PII in logs), photo-upload validation.

## Internationalisation

Three locales: `uk` (default, **unprefixed** URLs — `/shop`), `en` and `pl`
(prefixed — `/en/shop`, `/pl/shop`). This is handled by:

- `src/proxy.ts` — Next.js 16 renamed `middleware.ts` to `proxy.ts`
  (`export function proxy`, not `middleware`). It rewrites unprefixed
  requests to `/uk/...` internally; the URL the visitor sees never changes.
- `src/app/[locale]/...` — every route lives under the `[locale]` segment.
- `src/i18n/dictionaries/{uk,en,pl}.json` + `src/i18n/get-dictionary.ts` —
  all UI copy lives here, not inline in components. Add a key to all three
  files when adding a new string.

No page or component should have a hardcoded UI string — pull it from the
dictionary. Product data (names/descriptions) is currently Ukrainian-only
(real export, not yet translated).

## Data

`src/data/products.source.json` is the **real** product export (cleaned
from the Horoshop CMS the brand used previously) — 67 rows, one per
colour variant, grouped in `src/lib/products.ts` into ~37 presentation-ready
products. This is the source the importer (`scripts/import-horoshop.ts` →
`src/services/horoshop-import-service.ts`) reads to populate Payload's
`Products`/`Categories` collections; `product-repository.payload.ts` reads
it back out through the domain layer, including legacy Horoshop metadata
needed to keep old URLs/SKUs working.

## Routes

See `src/app/[locale]/` for the full tree: `/shop` + category sub-routes,
`/products/[slug]`, `/collections` + `/collections/[slug]`, `/cart`,
`/checkout`, `/order-status`, `/search`, `/warranty`, plus the informational
pages (`/about`, `/payment-delivery`, `/returns`, `/care`, `/designers`,
`/resources`, `/stockists`, `/faq`, `/contact`, and the legal pages). A
handful of informational pages with no real content yet (`/colours`,
`/projects`, `/samples`, `/careers`, and the legal/policy pages) remain on
the `PlaceholderPage` component — see
[Known gaps](#known-gaps--deliberately-deferred).

## SEO & legacy migration

- **`src/app/sitemap.ts` / `src/app/robots.ts`** — generate `/sitemap.xml`
  and `/robots.txt` (static routes; the proxy matcher excludes `.xml`/`.txt`
  so they bypass the locale rewrite). The sitemap enumerates every real,
  indexable path × 3 locales; placeholder/utility pages are `noindex` and
  excluded.
- **Structured data** — `Organization` + `WebSite` (home), `Product` (PDP),
  `BreadcrumbList`, and `CollectionPage` + `ItemList` (listing pages). Built
  only from real data (no invented fields), rendered through
  `src/lib/json-ld.ts`'s `serializeJsonLd` (escapes `<`/`>`/`&` so catalogue
  data can never break out of the `<script>` tag). No `FAQPage`/
  `LocalBusiness` — those need real, visible Q&A / verified business data.
- **Redirects** — old Horoshop product/category URLs and the informational
  pages (`/katalog/`, `/pro-nas/`, etc.) 301-redirect to their current
  equivalents. Product redirects are seeded by the Horoshop importer; the
  static informational-page redirects by `npm run seed:legacy-redirects`.
  `src/lib/legacy-redirects.ts` is the lookup, wired into `src/proxy.ts`.

## How to author content

Product/catalogue data is owned by Payload (admin at `/admin`) and seeded
from the real Horoshop export. Day-to-day authoring:

- **Add a product / collection / colour** — create it in the Payload admin
  under the matching collection (`Products`, `Categories`, `Colours`). The
  domain schema in `src/domain/catalog/` defines the required fields; the
  storefront reads it back through `product-repository.payload.ts`. To
  re-import from an updated Horoshop export instead, edit
  `src/data/products.source.json` and run `npm run import:horoshop` (dry
  run) then `npm run import:horoshop:live`.
- **Add a project** — the project domain schema (`src/domain/content/
project.ts`), search indexing, and the `/projects/[slug]` route metadata
  exist, but `/projects` itself is still a `PlaceholderPage`: wiring it to
  a real data source (Payload collection or a `src/data/` file) is the
  remaining step. Provide imagery per `IMAGE_REQUIREMENTS.md` (urban/
  interior crops).
- **Replace photographs** — every image renders through the shared
  `ProductImage`/`MediaFrame` wrappers (responsive `sizes`, blur
  placeholder, width/height baked in). Swap the asset in Payload `Media` or
  the referenced path; keep the ratio/orientation from
  `IMAGE_REQUIREMENTS.md` so layout doesn't shift.
- **Add / edit a translation** — all UI copy lives in
  `src/i18n/dictionaries/{uk,en,pl}.json`. Add the key to **all three**
  files; never hardcode a UI string in a component. Product copy is
  currently Ukrainian-only (real export, not yet translated).

## Modes (data backends)

There is no Shopify integration — it's a documented non-goal. The app runs
in one of two data modes:

- **Payload-backed (default/production)** — Postgres + Payload CMS is the
  source of truth for catalogue, cart, orders, and leads. Requires
  `DATABASE_URL` + `PAYLOAD_SECRET`.
- **Horoshop-snapshot fallback** — `product-repository.horoshop-snapshot.ts`
  reads the static `src/data/products.source.json` export directly, so the
  catalogue renders read-only without a database. Used as a resilient
  fallback and to keep tests hermetic. Optional integrations (email,
  LiqPay, S3, Telegram) each degrade gracefully to a local/console no-op
  when their env vars are unset.

## Design system

See `BRAND_VISUAL_GUIDE.md` for colour, type, and layout rules, and
`IMAGE_REQUIREMENTS.md` for photography requirements.

## Testing

`npm test` runs the full Vitest suite (336 tests across 62 files as of this
writing) — domain schema validation, repository mapping, service
orchestration, API route handlers (including CSRF/rate-limit guard
behavior), and component tests. `npm run test:e2e` runs the Playwright
suite across Chromium, Firefox, and WebKit (run `npx playwright install`
once first).

The e2e suite runs against `next dev` on purpose: the cart session cookie
is `Secure` in production (`src/lib/cart-session.ts`), and WebKit refuses
to store `Secure` cookies over plain `http://localhost`, so a `next start`
build served over http drops the cart in WebKit. Real production is HTTPS,
where `Secure` is correct and works in every browser. `playwright.config.ts`
sets one retry to absorb `next dev`'s on-demand first-compile blips under
three parallel engines.

CI-equivalent local check:
`npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.

## Deployment

See `DEPLOYMENT.md` for the full deploy guide (Vercel-first, with a
generic Node host fallback), required environment variables, the Postgres
requirement, post-deploy seeding steps, and the HTTPS requirement (the cart
session cookie is `Secure` in production, so the site must be served over
HTTPS).

## Known gaps / deliberately deferred

These are intentional scope decisions, not oversights — noted so future
work doesn't reinvent or second-guess them:

- **No Content-Security-Policy.** `next.config.ts` sets baseline security
  headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`) but not a full CSP — getting one right without
  breaking the Payload admin UI or Next dev's inline scripts needs
  dedicated testing against both.
- **Single-process rate limiting.** `src/lib/forms/rate-limit.ts` holds
  its hit-counter in-process memory. Correct for the current
  single-instance deployment; a multi-instance deployment would need a
  shared store (e.g. Redis) instead.
- **A few informational pages remain placeholders**: `/colours`,
  `/projects`, `/samples`, `/careers`, and the legal/policy pages have no
  real content yet — left as `PlaceholderPage` rather than filled with
  invented copy.
- **Product/content copy is Ukrainian-only.** English/Polish translation
  of product descriptions and any editorial content hasn't happened.
- **Shopify is explicitly out of scope.** Some domain/schema fields
  reference it only as a documented non-goal, not a partial integration.
- **`npm audit`** currently reports 10 findings, all in dev/build tooling
  or transitive dependencies of Next.js's own toolchain — none in the
  production request path handling user input: `sharp`/libvips (Next's
  bundled image optimizer; the direct `sharp` dependency is already on a
  patched 0.35.x), `postcss` (Next's build-time CSS), `esbuild` (via
  `drizzle-kit`, a migration/dev tool), `dompurify` (via `monaco-editor`,
  used only in dev), and `minimatch`/`brace-expansion` (via eslint plugins).
  Every offered "fix" is a breaking downgrade of Next.js itself, so they're
  tracked rather than force-patched. Re-run `npm audit` periodically and
  take a fix once a non-breaking one exists upstream.

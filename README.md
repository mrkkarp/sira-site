# ODUDLAB — site

Premium ecommerce/editorial site for ODUDLAB, an architectural-concrete
studio. Rebuilt on Next.js after outgrowing a Horoshop-based storefront and,
before that, a static HTML demo.

**Status: Part 1 of a multi-stage build — base architecture, design system,
header/footer, and route scaffolding only.** Shop listing, product pages,
cart, and most content pages are intentionally placeholders (see
`src/components/placeholder-page.tsx`) until later stages fill them in.

## Stack

- Next.js 16 (App Router, Turbopack, Server Components by default)
- TypeScript (strict)
- Tailwind CSS v4 (CSS-first config — see `src/app/globals.css`, no
  `tailwind.config.*` file)
- Zod for data validation
- Vitest for unit tests, Playwright for e2e
- ESLint + Prettier (with `prettier-plugin-tailwindcss`)

## Getting started

```
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command                | What it does                                         |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Dev server (Turbopack)                               |
| `npm run build`        | Production build + typecheck                         |
| `npm start`            | Serve the production build                           |
| `npm run lint`         | ESLint                                               |
| `npm run typecheck`    | `tsc --noEmit`                                       |
| `npm test`             | Vitest, single run                                   |
| `npm run test:watch`   | Vitest, watch mode                                   |
| `npm run test:e2e`     | Playwright (run `npx playwright install` once first) |
| `npm run format`       | Prettier, write                                      |
| `npm run format:check` | Prettier, check only                                 |

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
(real export, not yet translated) — see below.

## Data

`src/data/products.source.json` is the **real** product export (cleaned
from the Horoshop CMS the brand used previously) — 67 rows, one per
colour variant, grouped in `src/lib/products.ts` into ~37 presentation-ready
products (a base "Сірий базовий" row plus an optional custom-colour
sibling). Validated at load time with the Zod schemas in
`src/lib/schemas/product.ts`.

This data is **not** currently rendered anywhere (the shop/product pages are
placeholders) — it's wired up and type-checked so the next stage can build
the catalogue directly on top of it instead of re-importing.

`src/lib/schemas/collection.ts`, `project.ts`, and `colour.ts` are
forward-looking schemas for `/collections`, `/projects`, and `/colours` —
no real data exists for these yet (marked `demo: true` by default). Do not
invent fake collections/projects to fill them; leave the routes as
placeholders until real content exists.

## Routes

See `src/app/[locale]/` for the full tree. Everything from the brief is
wired up: `/shop` + 7 category sub-routes, `/products/[slug]`,
`/collections/[slug]`, `/colours`, `/samples`, `/projects` +
`/projects/[slug]`, `/about`, `/payment-delivery`, `/returns`, `/warranty`,
`/care`, `/designers`, `/resources`, `/stockists`, `/faq`, `/contact`,
`/search`, `/cart`.

## Design system

See `BRAND_VISUAL_GUIDE.md` for colour, type, and layout rules, and
`IMAGE_REQUIREMENTS.md` for what photography is needed before product/home
pages can be designed for real.

## Known issues

- `npm audit` flags 3 vulnerabilities (1 moderate, 2 high) in `postcss` and
  `sharp`, both bundled **inside** `next@16.2.11` itself (not our direct
  dependencies). `npm audit fix --force` would downgrade Next.js to `9.3.3`
  — do not run it. Wait for a Next.js patch release instead.
- This machine had no Node.js installed before this stage; it was installed
  via `winget install OpenJS.NodeJS.LTS`.

## What's next (not done in this stage)

- Real shop listing + filtering, product detail pages (using the data layer
  already built), cart/checkout are explicitly out of scope for now per the
  project owner.
- Real photography (see `IMAGE_REQUIREMENTS.md`) and the home/shop/product
  page designs that depend on it.
- Collections, projects, and colours real content.
- English/Polish translation of product copy (currently uk-only source
  data).
- SEO metadata routes (`sitemap.xml`, `robots.txt`) — intentionally not
  recreated yet; add via Next's `app/sitemap.ts` / `app/robots.ts`
  conventions once real routes have real content worth indexing.

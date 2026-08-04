# Deployment

This is a Next.js 16 (App Router) app backed by Payload CMS 3 on Postgres.
It targets Vercel first, but runs on any Node host that can reach a Postgres
database. Nothing here is Vercel-locked except the convenience of the
platform's build/env UI.

## Prerequisites

- **Node** matching the version the app builds with locally (Next 16 needs a
  current LTS or newer).
- **A Postgres database.** Payload requires it at build and runtime — the
  storefront's catalogue, cart, orders, and leads all live there. There is a
  read-only `product-repository.horoshop-snapshot.ts` fallback over the
  static export, but a real deployment should point at Postgres.
- **HTTPS.** The cart session cookie is `Secure` in production
  (`src/lib/cart-session.ts`). Served over plain HTTP, browsers (notably
  WebKit/Safari) will silently drop it and the cart will not persist. Any
  real host must terminate TLS — Vercel does this automatically.

## Environment variables

Set these in the host's environment (Vercel: Project → Settings →
Environment Variables). See `.env.example` for the annotated list.

### Required

| Variable                     | Purpose                                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Postgres connection string Payload uses (build + runtime).                                                                                                                                                                                          |
| `PAYLOAD_SECRET`             | Signs admin sessions/tokens. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.                                                                                                                                  |
| `CATALOG_SOURCE`             | Set to `payload` so the storefront reads the live Postgres catalogue (admin edits, prices, localized copy). Any other value / unset → the bundled `products.source.json` snapshot (uk-only, no admin edits). Production **must** be `payload`.      |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Public base URL of the R2 bucket product photos are served from, e.g. `https://pub-….r2.dev` (no trailing slash). Unset → images fall back to Payload's own media route. Required whenever `CATALOG_SOURCE=payload`.                                |
| `NEXT_PUBLIC_SITE_URL`       | Canonical public origin for ALL SEO URLs — `metadataBase`, canonical, hreflang, `sitemap.xml`, OG, JSON-LD. **Must be the live `https://` origin, no trailing slash.** If unset it falls back to `http://localhost:3000` and emits broken SEO URLs. |
| `NEXT_PUBLIC_SERVER_URL`     | Public origin Payload/admin links and the checkout LiqPay callback use. Set to the same live origin.                                                                                                                                                |

### Optional (feature-gated — unset = graceful no-op)

| Variable                                                                            | Enables                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EMAIL_FROM`, `RESEND_API_KEY`                                                      | Real email (admin password-reset, invites). Unset → reset links unsent.                                                                                                                                                 |
| `LEADS_NOTIFICATION_EMAIL`                                                          | Where new-lead notifications go. Unset → the forms API logs to console.                                                                                                                                                 |
| `ORDER_NOTIFICATION_EMAIL`                                                          | Where **new-order** notifications go. Unset → falls back to `LEADS_NOTIFICATION_EMAIL`; if that is unset too, the order is only logged to the server console. Set this to route orders to a different inbox than leads. |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` | S3-compatible media storage. Unset → local disk (not durable on Vercel).                                                                                                                                                |
| `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY`                                           | Online card payment at checkout. Unset → LiqPay path inactive.                                                                                                                                                          |
| `SEO_NOINDEX`                                                                       | Manual `noindex` override, on top of the automatic domain gate. Leave unset unless you need to de-index a non-`vercel.app` staging host. See "Search-engine indexing" below.                                            |

### Search-engine indexing

Indexing is gated automatically, on **two** conditions, both of which must hold:

1. `VERCEL_ENV=production` (Vercel sets it on its own). Every
   preview/development deploy — and local dev — fails this.
2. `NEXT_PUBLIC_SITE_URL` is the site's own domain, i.e. **not** a
   `*.vercel.app` host.

Anything that fails either one emits a site-wide `X-Robots-Tag: noindex,
nofollow` response header **and** a matching `<meta name="robots">`
(see `src/lib/seo/indexing.ts` and the header in `next.config.ts`).

The second condition is what keeps the pre-launch production deploy out of the
index, and it is deliberately **derived rather than remembered**. Condition 1
alone was true of `sira-site.vercel.app`, which was therefore serving
`index, follow` plus canonicals pointing at itself — an indexable duplicate of
the whole shop on a throwaway host. `SEO_NOINDEX` was supposed to cover that
window and was simply never set, which is what happens to a kill-switch whose
safe position is "on". Tying the answer to `NEXT_PUBLIC_SITE_URL` means
indexing turns on at exactly the moment the canonicals, hreflang, sitemap and
OG URLs start pointing at the real domain — one edit, and the two cannot
disagree.

**At cutover** the only required change is therefore
`NEXT_PUBLIC_SITE_URL=https://odudlab.com` (plus a redeploy, which Vercel does
for an env-var change). `SEO_NOINDEX=true` remains as a manual override for
anything this rule cannot see — a staging host that is not a `vercel.app`, or
an emergency de-index — and must be left unset for the launch to take effect.

> On Vercel, uploaded media on local disk is **not** durable (the filesystem
> is ephemeral per-invocation). Configure the S3 variables for any deploy
> that accepts media uploads (warranty photos, editorial assets).

## Deploy on Vercel

1. Import the repository into Vercel. Framework preset: **Next.js**. Override
   the **Build Command** to `npm run ci:build` (which runs `payload migrate`
   then `next build`). This is required: Payload's Drizzle `push` only runs in
   development (`@payloadcms/db-postgres` gates it on
   `NODE_ENV !== 'production'`), so a production database's schema is created
   and kept in sync **exclusively through the committed migrations in
   `src/migrations/`**. Running `next build` against an empty database without
   migrating first fails.
2. Provision Postgres (Vercel Postgres, Neon, Supabase, or any managed PG)
   and set `DATABASE_URL`.
3. Set the required env vars above for the Production (and Preview)
   environments. Point `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_SERVER_URL` at
   the production domain once assigned.
4. Deploy. The build runs `payload migrate` (idempotent — it records applied
   migrations in the `payload_migrations` table and skips them next time),
   then `next build` (which typechecks). The first deploy creates the whole
   schema; later deploys apply only new migrations.

> **Pooled vs direct connection (Neon).** With a serverless Postgres such as
> Neon, the runtime should use the **pooled** connection (`DATABASE_URL`) but
> migrations should run over the **direct/non-pooled** connection to avoid
> transaction-pooler edge cases (advisory locks). `npm run ci:build` handles
> this: its `ci:migrate` step points `DATABASE_URL` at
> `POSTGRES_URL_NON_POOLING` (which Neon's Vercel integration injects) for the
> migration, falling back to the plain `DATABASE_URL` when that var is absent
> (e.g. a non-Neon host). `next build` and runtime keep using the pooled
> `DATABASE_URL`.

> **Why `ci:migrate` pipes `echo y`.** If the database has ever had a dev
> server pointed at it, Payload's push writes a row into `payload_migrations`
> with `batch = -1`, and every later `payload migrate` stops to ask _"It looks
> like you've run Payload in dev mode… data loss will occur. Would you like to
> proceed?"_. There is no flag for this — `forceAcceptWarning` is wired only to
> `migrate:create` and `migrate:fresh`, not to plain `migrate` — so the answer
> has to come over stdin. Answering **no** makes `payload migrate` exit **0**
> without running anything, so the build goes green while the schema silently
> stays behind; that is how `20260803_122827_add_media_kind` missed its
> deploy. Answering yes only makes Payload ignore the `batch = -1` row when it
> works out the next batch number — it drops nothing.

### Schema changes after launch

Whenever you change a Payload collection/field, generate a new migration and
commit it so production applies it on the next deploy:

```
npm run payload migrate:create <name>   # writes src/migrations/<ts>_<name>.ts
git add src/migrations && git commit
```

Do **not** rely on `push` in production — it is disabled there by design, and
this repo now disables it **everywhere** by default (`push:
process.env.PAYLOAD_DB_PUSH === "true"` in `payload.config.ts`).

That extra step matters because there is only **one** Postgres database: the
`DATABASE_URL` in a developer's `.env.local` is the same Neon database Vercel
Production runs on. Payload's adapter pushes on connect whenever
`NODE_ENV !== 'production'` (`@payloadcms/db-postgres/dist/connect.js`), so at
the stock default a single `npm run dev` after editing a collection would ALTER
the live schema — no migration file, no review, no `payload_migrations` row —
and production would drift from what `src/migrations/` claims it is. Set
`PAYLOAD_DB_PUSH=true` only for a database you are willing to lose, and never in
Vercel.

Write the migration so it **converges** rather than assumes: `CREATE TYPE`
inside a `DO $$ … EXCEPTION WHEN duplicate_object THEN null; END $$`,
`ADD COLUMN IF NOT EXISTS`, `DROP … IF EXISTS`. `migrate:create` diffs the
config against the snapshot beside it, not against the live database, so
whenever a dev server has already pushed the same change the generated
statements will collide with the schema that is really there — and
`runMigrationFile` treats one failed statement as fatal (`process.exit(1)`),
taking the whole build down with it. See
`src/migrations/20260803_122827_add_media_kind.ts` for the shape.

## Deploy on a generic Node host

```
npm ci
npm run build      # production build (also typechecks)
npm run start      # serves on :3000 — put HTTPS-terminating reverse proxy in front
```

Run behind a reverse proxy (nginx/Caddy) that terminates TLS and forwards
`X-Forwarded-For` (the form rate-limiter reads it for the client key —
`src/lib/forms/rate-limit.ts`).

## Post-deploy seeding

Against the production database, once, after the first deploy:

```
npm run import:horoshop:live    # populate Products/Categories from the export
npm run seed:legacy-redirects   # 301s for the old Horoshop informational URLs
```

Product-level legacy redirects are created by the importer itself. Verify a
few old URLs 301 to a working new page after seeding.

## Post-deploy smoke checklist

- `/`, `/shop`, a real `/products/[slug]`, `/en`, `/pl` all return 200.
- `/sitemap.xml` and `/robots.txt` return 200 and reference the real
  `NEXT_PUBLIC_SITE_URL` origin (not localhost).
- Add-to-cart persists across a reload (confirms the `Secure` cookie works —
  i.e. you're on HTTPS).
- A known legacy URL 301-redirects to its current equivalent.
- Submit a contact/callback form; confirm it's accepted (and, if email is
  configured, that the notification arrives).
- `/admin` loads and an admin user can sign in.

## Known operational limits

- **Single-process rate limiting.** `src/lib/forms/rate-limit.ts` keeps its
  counter in process memory — correct for a single instance, but a
  multi-instance/serverless-fanout deployment needs a shared store (Redis).
  On Vercel's serverless model this means the limit is per-instance, not
  global.
- **No Content-Security-Policy** yet (baseline security headers only — see
  `next.config.ts`).
- See `README.md` → "Known gaps / deliberately deferred" for the full list.

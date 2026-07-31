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

| Variable                 | Purpose                                                                                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Postgres connection string Payload uses (build + runtime).                                                                                                                                                                                          |
| `PAYLOAD_SECRET`         | Signs admin sessions/tokens. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.                                                                                                                                  |
| `CATALOG_SOURCE`         | Set to `payload` so the storefront reads the live Postgres catalogue (admin edits, prices, localized copy). Any other value / unset → the bundled `products.source.json` snapshot (uk-only, no admin edits). Production **must** be `payload`.        |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Public base URL of the R2 bucket product photos are served from, e.g. `https://pub-….r2.dev` (no trailing slash). Unset → images fall back to Payload's own media route. Required whenever `CATALOG_SOURCE=payload`.                             |
| `NEXT_PUBLIC_SITE_URL`   | Canonical public origin for ALL SEO URLs — `metadataBase`, canonical, hreflang, `sitemap.xml`, OG, JSON-LD. **Must be the live `https://` origin, no trailing slash.** If unset it falls back to `http://localhost:3000` and emits broken SEO URLs. |
| `NEXT_PUBLIC_SERVER_URL` | Public origin Payload/admin links and the checkout LiqPay callback use. Set to the same live origin.                                                                                                                                                |

### Optional (feature-gated — unset = graceful no-op)

| Variable                                                                            | Enables                                                                  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `EMAIL_FROM`, `RESEND_API_KEY`                                                      | Real email (admin password-reset, invites). Unset → reset links unsent.  |
| `LEADS_NOTIFICATION_EMAIL`                                                          | Where new-lead notifications go. Unset → the forms API logs to console.  |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` | S3-compatible media storage. Unset → local disk (not durable on Vercel). |
| `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY`                                           | Online card payment at checkout. Unset → LiqPay path inactive.           |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                                            | Telegram admin notifications.                                            |

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

### Schema changes after launch

Whenever you change a Payload collection/field, generate a new migration and
commit it so production applies it on the next deploy:

```
npm run payload migrate:create <name>   # writes src/migrations/<ts>_<name>.ts
git add src/migrations && git commit
```

Do **not** rely on `push` in production — it is disabled there by design.

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

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig, type Plugin } from "payload";

import { Users } from "./src/collections/Users";
import { Media } from "./src/collections/Media";
import { Categories } from "./src/collections/Categories";
import { Colours } from "./src/collections/Colours";
import { Products } from "./src/collections/Products";
import { Pages } from "./src/collections/Pages";
import { Documents } from "./src/collections/Documents";
import { Carts } from "./src/collections/Carts";
import { Orders } from "./src/collections/Orders";
import { Payments } from "./src/collections/Payments";
import { Leads } from "./src/collections/Leads";
import { Redirects } from "./src/collections/Redirects";
import { ImportBatches } from "./src/collections/ImportBatches";
import { ImportWarnings } from "./src/collections/ImportWarnings";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * S3 media storage (DEPLOYMENT.md → "Optional / S3-compatible media storage").
 *
 * Gated entirely on env presence so this is a graceful no-op until the owner
 * provisions a bucket: with no S3 vars set the plugin is omitted and Media
 * keeps using local disk (`staticDir: "../media"`), exactly as before — which
 * is fine for local dev but NOT durable on Vercel (ephemeral filesystem). Set
 * all of `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
 * (and `S3_ENDPOINT` for non-AWS S3-compatible hosts like Cloudflare R2 /
 * Backblaze B2 / MinIO) to switch the `media` collection over to S3.
 *
 * Secrets live only in the host env (Vercel env UI / gitignored `.env.local`),
 * never in this file or Git.
 */
const s3Enabled = Boolean(
  process.env.S3_BUCKET &&
    process.env.S3_REGION &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
);

const plugins: Plugin[] = [];
if (s3Enabled) {
  plugins.push(
    s3Storage({
      collections: { media: true },
      bucket: process.env.S3_BUCKET!,
      config: {
        region: process.env.S3_REGION!,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        // Custom endpoint + path-style addressing for S3-compatible hosts
        // (R2/B2/MinIO). Omitted for real AWS S3, which uses the default
        // virtual-hosted endpoint derived from the region.
        ...(process.env.S3_ENDPOINT
          ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
          : {}),
      },
    }),
  );
}

/**
 * ODUDLAB admin — Payload CMS 3 config (Prompt 10 §1–§2).
 *
 * Foundation phase: local-Postgres only (per the user's own instruction
 * to keep hosting decisions paused — `DATABASE_URL` points at a locally
 * installed Postgres, no production database/host chosen yet), Lexical
 * editor, uk/en/pl localization matching `src/i18n/config.ts`. `Products`
 * now carries the full §7 model (specs taxonomy, pricing incl. private
 * cost price, price-change history, variants, product-level documents,
 * extended SEO); `Documents` is a separate upload collection for
 * technical files (PDF/DWG/DXF/SKP/OBJ/STL/BIM), distinct from `Media`
 * (photography). Everything else in the ~40-section spec (articles,
 * projects, navigation, leads/CRM, orders, translations workflow UI,
 * audit log, import/export, etc.) is intentionally deferred to later
 * phases so this can be verified end-to-end before the surface area
 * grows further.
 *
 * Phase B (Prompt 8 §2.3/§2.4) adds the commerce/ops collections the
 * new domain models + repository layer (`src/domain/`, `src/repositories/`)
 * need a real backing store for: `Carts`/`Orders`/`Payments` (server-
 * persisted checkout), `Leads` (all six form types, one table), and
 * `Redirects`/`ImportBatches`/`ImportWarnings` (Horoshop legacy-URL and
 * import-run bookkeeping for the Phase G importer). Articles/Projects/
 * FAQ/Stockists/Resources/Navigation/PromoCodes remain domain-modeled
 * only (no Payload collection yet) — deferred to whichever later phase
 * actually needs them persisted, per the same "don't grow surface area
 * ahead of need" principle as Phase 1.
 */
export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: " — ODUDLAB Admin",
    },
  },
  collections: [
    Users,
    Media,
    Categories,
    Colours,
    Products,
    Pages,
    Documents,
    Carts,
    Orders,
    Payments,
    Leads,
    Redirects,
    ImportBatches,
    ImportWarnings,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  localization: {
    locales: ["uk", "en", "pl"],
    defaultLocale: "uk",
  },
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
  }),
  plugins,
  sharp,
});

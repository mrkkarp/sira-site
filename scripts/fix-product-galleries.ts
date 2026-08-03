/**
 * Restore lost product galleries (owner request "фото пропало / розкидані").
 *
 * 10 products kept only their mainImage because 29 gallery source files were
 * never copied into public/products before the Horoshop import, so the importer
 * skipped them. Those files exist in `_horoshop-export/media/`. This script
 * uploads each missing gallery image to Payload Media (→ R2 via the s3Storage
 * plugin, which is active because S3_* are set in .env.local) and rebuilds each
 * product's mainImage + gallery in the exact source order.
 *
 * SAFETY:
 *  - Writes a backup of every touched product's current mainImage/gallery to
 *    `_content-audit/photo-fix-backup.json` BEFORE any change.
 *  - Additive & idempotent: reuses an existing Media doc when a file with the
 *    same filename already exists (so re-runs don't duplicate; mainImages that
 *    are already in R2 are reused, not re-uploaded).
 *  - Pass --apply to write. Without it, does a dry run (no DB/R2 writes).
 *
 * Run (dry):   NODE_ENV=production node --env-file-if-exists=.env.local \
 *                node_modules/.bin/tsx scripts/fix-product-galleries.ts
 * Run (apply): ... scripts/fix-product-galleries.ts --apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../payload.config";

const APPLY = process.argv.includes("--apply");
const ROOT = process.cwd();
const MEDIA_DIR = path.join(ROOT, "_horoshop-export", "media");

interface PlanImage {
  name: string;
  media: string;
}
interface PlanProduct {
  parentSku: string;
  alias: string;
  images: PlanImage[];
}

const plan: PlanProduct[] = JSON.parse(
  readFileSync(
    path.join(ROOT, "_content-audit", "photo-fix-plan.json"),
    "utf8",
  ),
);

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};
function mimeOf(name: string): string {
  return MIME[path.extname(name).toLowerCase()] ?? "image/jpeg";
}

async function main() {
  const payload = await getPayload({ config });

  const backup: unknown[] = [];
  const summary: unknown[] = [];

  for (const p of plan) {
    const found = await payload.find({
      collection: "products",
      where: { sku: { equals: p.parentSku } },
      locale: "uk" as never,
      depth: 1,
      limit: 1,
      overrideAccess: true,
    });
    const doc = found.docs[0] as unknown as Record<string, unknown> | undefined;
    if (!doc) {
      summary.push({ parentSku: p.parentSku, status: "NOT_FOUND" });
      continue;
    }

    const curMain = doc.mainImage as
      { id?: number; filename?: string } | number | null;
    const curGallery =
      (doc.gallery as Array<{ id?: number; filename?: string } | number>) ?? [];
    backup.push({
      parentSku: p.parentSku,
      id: doc.id,
      mainImage:
        curMain && typeof curMain === "object"
          ? { id: curMain.id, filename: curMain.filename }
          : curMain,
      gallery: curGallery.map((g) =>
        g && typeof g === "object" ? { id: g.id, filename: g.filename } : g,
      ),
    });

    // Resolve every planned image to a Media id (reuse or create).
    const mediaIds: number[] = [];
    const actions: string[] = [];
    for (const img of p.images) {
      const existing = await payload.find({
        collection: "media",
        where: { filename: { equals: img.name } },
        limit: 1,
        overrideAccess: true,
      });
      if (existing.docs[0]) {
        mediaIds.push((existing.docs[0] as { id: number }).id);
        actions.push(`reuse ${img.name}`);
        continue;
      }
      // Create: upload the local original → R2.
      const data = readFileSync(path.join(MEDIA_DIR, img.media));
      if (!APPLY) {
        actions.push(`CREATE ${img.name} (${data.byteLength}b) [dry]`);
        mediaIds.push(-1);
        continue;
      }
      const created = await payload.create({
        collection: "media",
        // Same as the importer: the source says nothing about drawings, so
        // everything lands as `photo` and `mark-technical-drawings.ts` corrects
        // the known ones afterwards.
        data: { alt: p.parentSku, kind: "photo" },
        file: {
          data,
          mimetype: mimeOf(img.name),
          name: img.name,
          size: data.byteLength,
        },
        overrideAccess: true,
      });
      const cf = (created as { id: number; filename?: string }).filename;
      if (cf && cf !== img.name) {
        actions.push(`CREATE ${img.name} -> stored as ${cf} (RENAMED!)`);
      } else {
        actions.push(`CREATE ${img.name}`);
      }
      mediaIds.push((created as { id: number }).id);
    }

    const mainImageId = mediaIds[0];
    const galleryIds = mediaIds.slice(1);

    if (APPLY) {
      await payload.update({
        collection: "products",
        id: doc.id as number,
        data: { mainImage: mainImageId, gallery: galleryIds },
        overrideAccess: true,
      });
    }
    summary.push({
      parentSku: p.parentSku,
      slug: doc.slug,
      total: p.images.length,
      mainImageId,
      galleryCount: galleryIds.length,
      actions,
    });
  }

  writeFileSync(
    path.join(ROOT, "_content-audit", "photo-fix-backup.json"),
    JSON.stringify(backup, null, 2),
  );
  console.log("###SUMMARY###");
  console.log(JSON.stringify({ apply: APPLY, summary }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

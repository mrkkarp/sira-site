/**
 * One-off backfill for the two facts the original Horoshop import dropped.
 *
 * Both already exist in the source export — this does not invent anything:
 *  1. "Підключення: …" — a real sentence in the source `fullDesc` that had no
 *     Payload field to land in, so it was skipped. It now goes into the
 *     dedicated `specs.connection` field.
 *  2. "Колір: Сірий базовий" — the base colourway. The importer built the
 *     base variant with no `optionAxes` at all, so the colour never reached
 *     the database; only the "Свій колір" custom variant carried anything.
 *     It now becomes a real `optionAxes.colour` relationship to a Colour doc.
 *
 * Idempotent: re-running writes the same values. Products already carrying a
 * value are left alone, so an admin edit is never overwritten.
 *
 * Dry run by default — pass `--live` to write.
 *
 *   node_modules/.bin/tsx scripts/backfill-specs-and-colour.ts          # preview
 *   node_modules/.bin/tsx scripts/backfill-specs-and-colour.ts --live   # write
 */
import { getPayload } from "payload";
import config from "../payload.config";
import rawSource from "../src/data/products.source.json";
import { ProductSourceFileSchema } from "../src/lib/schemas/product";
import { groupProductSourceRows } from "../src/lib/product-grouping";
import { mapSpecEntriesToPayloadSpecs } from "../src/lib/product-mapping";

const BASE_COLOUR_SLUG = "siry-bazovyi";
const BASE_COLOUR_LABEL = "Сірий базовий";
const BASE_COLOUR_HEX = "#9e9d98";

const live = process.argv.includes("--live");

async function main() {
  const payload = await getPayload({ config });

  const rows = ProductSourceFileSchema.parse(rawSource satisfies unknown[]);
  const sourceBySku = new Map(
    groupProductSourceRows(rows).map((p) => [p.sku, p]),
  );

  // --- Colour document -----------------------------------------------------
  let colourId: number | undefined;
  const existingColour = await payload.find({
    collection: "colours",
    where: { slug: { equals: BASE_COLOUR_SLUG } },
    limit: 1,
    overrideAccess: true,
  });
  if (existingColour.docs[0]) {
    colourId = existingColour.docs[0].id;
    console.log(`Колір "${BASE_COLOUR_LABEL}" вже існує (id ${colourId}).`);
  } else if (live) {
    const created = await payload.create({
      collection: "colours",
      locale: "uk",
      overrideAccess: true,
      draft: false,
      data: {
        _status: "published",
        displayName: BASE_COLOUR_LABEL,
        slug: BASE_COLOUR_SLUG,
        digitalPreviewHex: BASE_COLOUR_HEX,
        textMode: "dark",
        physicalSampleAvailable: false,
        disclaimer:
          "Колір на екрані — орієнтовний. Точний відтінок бетону залежить від партії цементу та умов освітлення.",
      },
    });
    colourId = created.id;
    console.log(`Створено колір "${BASE_COLOUR_LABEL}" (id ${colourId}).`);
  } else {
    console.log(`[dry] Буде створено колір "${BASE_COLOUR_LABEL}".`);
  }

  // --- Products ------------------------------------------------------------
  const products = await payload.find({
    collection: "products",
    limit: 0,
    locale: "uk",
    depth: 0,
    overrideAccess: true,
  });

  let connectionWrites = 0;
  let colourWrites = 0;
  let skipped = 0;

  for (const doc of products.docs) {
    const source = sourceBySku.get(doc.sku);
    if (!source) {
      skipped++;
      continue;
    }
    const mapped = mapSpecEntriesToPayloadSpecs(source.specEntries);

    const data: Record<string, unknown> = {};

    // 1. connection — only when the source actually states it and the field
    //    is still empty (never clobber an admin edit).
    const currentConnection = doc.specs?.connection;
    if (mapped.connection && !currentConnection) {
      data.specs = { ...doc.specs, connection: mapped.connection };
      connectionWrites++;
      console.log(`  ${doc.sku}: підключення → "${mapped.connection}"`);
    }

    // 2. base variant colour — first variant is the base colourway (the
    //    importer always writes it first).
    //
    //    Guarded on the source actually stating the colour: 7 of the 38
    //    products (6 outdoor + RIFLO) have an EMPTY `color` field in the
    //    export. Linking those to "Сірий базовий" anyway would be inventing
    //    a fact the source does not contain — their colour stays unset until
    //    someone confirms it.
    const variants = doc.variants ?? [];
    const base = variants[0];
    const sourceStatesBaseColour =
      source.base.colorLabel === BASE_COLOUR_LABEL;
    if (
      colourId != null &&
      sourceStatesBaseColour &&
      base &&
      base.optionAxes?.colour == null &&
      !base.optionAxes?.custom
    ) {
      data.variants = variants.map((variant, index) =>
        index === 0
          ? {
              ...variant,
              optionAxes: { ...variant.optionAxes, colour: colourId },
            }
          : variant,
      );
      colourWrites++;
      console.log(`  ${doc.sku}: базовий варіант → колір "${BASE_COLOUR_LABEL}"`);
    }

    if (Object.keys(data).length === 0) continue;
    if (!live) continue;

    await payload.update({
      collection: "products",
      id: doc.id,
      locale: "uk",
      overrideAccess: true,
      draft: false,
      data,
    });
  }

  console.log(
    `\n${live ? "Записано" : "[dry] Буде записано"}: ` +
      `підключення — ${connectionWrites}, колір базового варіанта — ${colourWrites}. ` +
      `Товарів без відповідника в джерелі: ${skipped}.`,
  );
  if (!live) console.log("Це попередній перегляд. Додайте --live, щоб застосувати.");

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Fills the `en` and `pl` locales for the product spec fields, which the
 * Horoshop importer only ever wrote in `uk` (it runs with `locale: "uk"`).
 *
 * Scope is deliberately tiny and fully enumerated: across all 38 products
 * there are only 10 distinct Ukrainian spec values (1 material, 5 faucet
 * types, 1 mount type, 3 connections). Each is translated once here rather
 * than machine-translated per row, so the wording is consistent across the
 * catalogue and reviewable at a glance.
 *
 * Only exact, known source strings are translated — an unrecognised value is
 * reported and left untouched rather than guessed at. Existing non-empty
 * en/pl values are never overwritten, so a manual correction in the admin
 * survives a re-run.
 *
 * Dry run by default — pass `--live` to write.
 */
import { getPayload } from "payload";
import config from "../payload.config";

const live = process.argv.includes("--live");

/** uk value -> { en, pl }, per spec field. */
const TRANSLATIONS: Record<string, Record<string, { en: string; pl: string }>> =
  {
    material: {
      "архітектурний бетон": {
        en: "architectural concrete",
        pl: "beton architektoniczny",
      },
    },
    faucetType: {
      "зі стіни": { en: "wall-mounted", pl: "ścienna" },
      "зі стіни, окремо стоячий": {
        en: "wall-mounted or freestanding",
        pl: "ścienna lub wolnostojąca",
      },
      "інтегрований у раковину": {
        en: "integrated into the basin",
        pl: "zintegrowana z umywalką",
      },
      "зі стіни або з раковини": {
        en: "wall-mounted or basin-mounted",
        pl: "ścienna lub montowana w umywalce",
      },
      "інтегрований або зі стіни": {
        en: "integrated or wall-mounted",
        pl: "zintegrowana lub ścienna",
      },
    },
    mountType: {
      "накладний на стільницю": {
        en: "countertop (vessel)",
        pl: "nablatowa",
      },
    },
    connection: {
      "можливе зі стіни або з підлоги": {
        en: "wall or floor connection possible",
        pl: "podłączenie ścienne lub podłogowe",
      },
      "приховане підлогове": {
        en: "concealed floor connection",
        pl: "ukryte podłogowe",
      },
      приховане: { en: "concealed", pl: "ukryte" },
    },
  };

const SPEC_FIELDS = Object.keys(TRANSLATIONS);

async function main() {
  const payload = await getPayload({ config });

  const ukDocs = await payload.find({
    collection: "products",
    limit: 0,
    locale: "uk",
    depth: 0,
    overrideAccess: true,
  });

  const unknown = new Set<string>();
  let written = 0;

  for (const locale of ["en", "pl"] as const) {
    const existing = await payload.find({
      collection: "products",
      limit: 0,
      locale,
      depth: 0,
      overrideAccess: true,
    });
    const existingById = new Map(existing.docs.map((d) => [d.id, d]));

    for (const ukDoc of ukDocs.docs) {
      const current = existingById.get(ukDoc.id);
      const specs: Record<string, string> = {};

      for (const field of SPEC_FIELDS) {
        const ukValue = (ukDoc.specs as Record<string, unknown> | undefined)?.[
          field
        ];
        if (typeof ukValue !== "string" || !ukValue.trim()) continue;

        // Payload's locale fallback is on, and `fallbackLocale: null` does not
        // switch it off — an untranslated en/pl field reads back as the uk
        // value. So "is it already translated?" cannot be answered by asking
        // whether the value is non-empty. Instead: a value that still equals
        // the uk one is the fallback showing through (untranslated), anything
        // else is a real translation or a manual admin edit and is left alone.
        //
        // Idempotent by construction: every translation below differs from its
        // Ukrainian source, so a second run sees "differs" and skips.
        const currentValue = (
          current?.specs as Record<string, unknown> | undefined
        )?.[field];
        if (
          typeof currentValue === "string" &&
          currentValue.trim() &&
          currentValue.trim() !== ukValue.trim()
        )
          continue;

        const translation = TRANSLATIONS[field][ukValue.trim()];
        if (!translation) {
          unknown.add(`${field}: "${ukValue}"`);
          continue;
        }
        specs[field] = translation[locale];
      }

      if (Object.keys(specs).length === 0) continue;
      console.log(
        `  [${locale}] ${ukDoc.sku}: ${Object.entries(specs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(", ")}`,
      );
      written++;
      if (!live) continue;

      await payload.update({
        collection: "products",
        id: ukDoc.id,
        locale,
        overrideAccess: true,
        draft: false,
        data: { specs },
      });
    }
  }

  if (unknown.size > 0) {
    console.log("\nБез перекладу (залишено як є, треба додати вручну):");
    for (const item of unknown) console.log("  -", item);
  }
  console.log(
    `\n${live ? "Оновлено" : "[dry] Буде оновлено"} документів: ${written}.`,
  );
  if (!live) console.log("Це попередній перегляд. Додайте --live, щоб застосувати.");

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

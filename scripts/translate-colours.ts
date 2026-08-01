/**
 * Fills the `en` and `pl` locales for the Colours collection, which the
 * backfill only ever wrote in `uk`.
 *
 * Same shape and same rules as `translate-specs.ts`: the scope is one colour
 * document with two localized fields, both enumerated by hand rather than
 * machine-translated, and an unrecognised source string is reported and left
 * untouched rather than guessed at.
 *
 * The "already translated?" check cannot ask whether the en/pl value is
 * non-empty — Payload's locale fallback is on, so an untranslated field reads
 * back as the uk value. It compares against uk instead: still-equal means the
 * fallback is showing through, anything else is a real translation or a manual
 * admin edit and is left alone. Idempotent, since every translation below
 * differs from its Ukrainian source.
 *
 * Dry run by default — pass `--live` to write.
 *
 *   NODE_ENV=production node --env-file-if-exists=.env.local \
 *     node_modules/.bin/tsx scripts/translate-colours.ts          # preview
 *   … scripts/translate-colours.ts --live                         # write
 */
import { getPayload } from "payload";
import config from "../payload.config";

const live = process.argv.includes("--live");

/** uk value -> { en, pl }, per localized field. */
const TRANSLATIONS: Record<string, Record<string, { en: string; pl: string }>> =
  {
    displayName: {
      "Сірий базовий": { en: "Base grey", pl: "Szary bazowy" },
    },
    disclaimer: {
      "Колір на екрані — орієнтовний. Точний відтінок бетону залежить від партії цементу та умов освітлення.":
        {
          en: "The on-screen colour is indicative only. The exact shade of the concrete depends on the cement batch and the lighting conditions.",
          pl: "Kolor na ekranie jest orientacyjny. Dokładny odcień betonu zależy od partii cementu i warunków oświetlenia.",
        },
    },
  };

const FIELDS = Object.keys(TRANSLATIONS);

async function main() {
  const payload = await getPayload({ config });

  const ukDocs = await payload.find({
    collection: "colours",
    limit: 0,
    locale: "uk",
    depth: 0,
    overrideAccess: true,
  });

  const unknown = new Set<string>();
  let written = 0;

  for (const locale of ["en", "pl"] as const) {
    const existing = await payload.find({
      collection: "colours",
      limit: 0,
      locale,
      depth: 0,
      overrideAccess: true,
    });
    const existingById = new Map(existing.docs.map((d) => [d.id, d]));

    for (const ukDoc of ukDocs.docs) {
      const current = existingById.get(ukDoc.id);
      const data: Record<string, string> = {};

      for (const field of FIELDS) {
        const ukValue = (ukDoc as unknown as Record<string, unknown>)[field];
        if (typeof ukValue !== "string" || !ukValue.trim()) continue;

        const currentValue = (
          current as unknown as Record<string, unknown> | undefined
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
        data[field] = translation[locale];
      }

      if (Object.keys(data).length === 0) continue;
      console.log(
        `  [${locale}] ${ukDoc.slug}: ${Object.keys(data).join(", ")}`,
      );
      written++;
      if (!live) continue;

      await payload.update({
        collection: "colours",
        id: ukDoc.id,
        locale,
        overrideAccess: true,
        draft: false,
        data,
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
  if (!live)
    console.log("Це попередній перегляд. Додайте --live, щоб застосувати.");

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

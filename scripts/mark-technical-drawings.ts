/**
 * One-off backfill: mark the catalogue's technical drawings as such.
 *
 * The Horoshop export delivered dimensioned drawings through the same gallery
 * field as the photographs, under the same product-name filenames — compare
 * `square-nakladna-59954535570175_….jpg`, a drawing, with its `square-nakladna-*`
 * siblings, which are photographs. Nothing in the filename, the MIME type or the
 * image statistics separates them: a washbasin shot on seamless white scores
 * like a line drawing on every cheap measure (near-white fraction, saturation,
 * distinct-colour count). Statistics were only good enough to build a shortlist.
 *
 * So the list below is the result of looking at every one of the 123 catalogue
 * images: 9 drawings with red dimension annotations and 8 greyscale CAD
 * sections. Seven renders on white backgrounds that the statistics flagged were
 * inspected and deliberately excluded — they are photographs of the object.
 *
 * Idempotent: files already marked `drawing` are left alone, and a file the
 * admin has since re-marked as `photo` will be corrected back, since this list
 * is the record of what these files are.
 *
 * Dry run by default — pass `--live` to write.
 *
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/mark-technical-drawings.ts
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/mark-technical-drawings.ts --live
 */
import { getPayload } from "payload";
import config from "../payload.config";

/**
 * Filenames as stored by Payload (the upload hash suffix included). Grouped by
 * what the drawing looks like, which is also how they were identified.
 */
const DRAWING_FILENAMES = [
  // Red-annotated dimension drawings.
  "copy_monro-87004847341533_-03f852dd5a.jpg",
  "copy_odri-nakladna-43185662241585_-f7f7f4a555.jpg",
  "monro-38976622451553_-8ca9e1b3c7.jpg",
  "nori-67845827127244_-d1b61ef919.jpg",
  "odri-nakladna-40440242944687_-d324cd70f3.jpg",
  "semi-nakladna-44678165163932_-e0fa0b2e2b.jpg",
  "square-33252865269653_-2ecb976fe2.jpg",
  "square-nakladna-59954535570175_-69f2a56ea0.jpg",
  "tower-19290104029328_-da1959a678.jpg",
  // Greyscale CAD sections and plans.
  "low-17214127781062_-2cb155584a.png",
  "low-56330094311538_-c4186b23f1.png",
  "odri-z-kaneliuramy-54389673050818_-425a07fdf7.png",
  "odri-z-kaneliuramy-57338969470828_-391f02c687.png",
  "odri-z-kaneliuramy-89729245387966_-566b72b7f7.png",
  "rakovyna-na-pidlohu-odri-29679183715894_-22e310e533.png",
  "rakovyna-na-pidlohu-odri-56151018383051_-be7da63d57.png",
  "rakovyna-na-pidlohu-odri-98559971557123_-7c016467a6.png",
];

const live = process.argv.includes("--live");

async function main() {
  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "media",
    limit: 0,
    pagination: false,
    overrideAccess: true,
  });

  const byFilename = new Map(
    docs.flatMap((doc) => (doc.filename ? [[doc.filename, doc] as const] : [])),
  );

  const missing = DRAWING_FILENAMES.filter((name) => !byFilename.has(name));
  const toUpdate = DRAWING_FILENAMES.flatMap((name) => {
    const doc = byFilename.get(name);
    return doc && doc.kind !== "drawing" ? [doc] : [];
  });
  const alreadyMarked =
    DRAWING_FILENAMES.length - missing.length - toUpdate.length;

  console.log(`Медіафайлів у базі: ${docs.length}`);
  console.log(`Креслень у списку: ${DRAWING_FILENAMES.length}`);
  console.log(`Уже позначено: ${alreadyMarked}`);
  console.log(`Потребують позначення: ${toUpdate.length}`);
  for (const doc of toUpdate) console.log(`  · ${doc.filename} (id ${doc.id})`);

  if (missing.length > 0) {
    // Not fatal on its own — a media doc may legitimately have been deleted —
    // but it means the list has drifted from the library and deserves a look.
    console.warn(`\nНе знайдено в базі (${missing.length}):`);
    for (const name of missing) console.warn(`  · ${name}`);
  }

  /**
   * Anything marked `drawing` that this list doesn't claim was marked by hand
   * in the admin. Report it, never revert it — an editor uploading a new
   * drawing is exactly the workflow the field exists for.
   */
  const unlisted = docs.filter(
    (doc) =>
      doc.kind === "drawing" &&
      doc.filename &&
      !DRAWING_FILENAMES.includes(doc.filename),
  );
  if (unlisted.length > 0) {
    console.log(`\nПозначені як креслення поза списком (${unlisted.length}):`);
    for (const doc of unlisted)
      console.log(`  · ${doc.filename} (id ${doc.id})`);
  }

  if (!live) {
    console.log("\nПробний запуск. Додайте --live, щоб записати зміни.");
    return;
  }

  for (const doc of toUpdate) {
    await payload.update({
      collection: "media",
      id: doc.id,
      data: { kind: "drawing" },
      overrideAccess: true,
    });
    console.log(`Позначено: ${doc.filename}`);
  }
  console.log(`\nГотово. Оновлено ${toUpdate.length} файлів.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

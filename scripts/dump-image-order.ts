/** READ-ONLY: dump each product's mainImage + gallery filenames in order. */
import { getPayload } from "payload";
import config from "../payload.config";

function fn(m: unknown): string {
  if (m && typeof m === "object") {
    const o = m as Record<string, unknown>;
    return (o.filename as string) ?? String(o.id ?? "?");
  }
  return `#${m}`;
}

async function main() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: "products",
    where: { editorialStatus: { equals: "published" } },
    depth: 1,
    limit: 0,
    overrideAccess: true,
    locale: "uk" as never,
  });
  const out = (res.docs as unknown as Array<Record<string, unknown>>).map((d) => ({
    sku: d.sku,
    slug: d.slug,
    main: fn(d.mainImage),
    gallery: ((d.gallery as unknown[]) ?? []).map(fn),
  }));
  console.log("###JSON###");
  console.log(JSON.stringify(out));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

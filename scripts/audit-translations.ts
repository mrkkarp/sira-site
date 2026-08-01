/** READ-ONLY translation coverage dump. NODE_ENV=production → no schema push. */
import { getPayload } from "payload";
import config from "../payload.config";

function v(x: unknown, l: string): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  const o = x as Record<string, unknown>;
  return (o[l] ?? "").toString();
}

async function main() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: "products",
    locale: "all" as never,
    depth: 0,
    limit: 0,
    overrideAccess: true,
  });
  const rows = (res.docs as unknown as Array<Record<string, unknown>>).map((d) => {
    const seo = (d.seo ?? {}) as Record<string, unknown>;
    return {
      sku: d.sku,
      slug: d.slug,
      name_uk: v(d.name, "uk"),
      name_en: v(d.name, "en"),
      name_pl: v(d.name, "pl"),
      short_uk: v(d.shortDescription, "uk").slice(0, 40),
      short_en: v(d.shortDescription, "en").slice(0, 40),
      short_pl: v(d.shortDescription, "pl").slice(0, 40),
      seoT_uk: v(seo.metaTitle, "uk").slice(0, 30),
      seoT_en: v(seo.metaTitle, "en").slice(0, 30),
      seoT_pl: v(seo.metaTitle, "pl").slice(0, 30),
    };
  });
  console.log("###JSON###");
  console.log(JSON.stringify(rows));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

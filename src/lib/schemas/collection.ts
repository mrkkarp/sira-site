import { z } from "zod";

/**
 * A themed collection grouping several products (e.g. "Outdoor 2025").
 * No real collections exist yet — this schema is forward-looking scaffolding
 * for `/collections/[slug]`. Populate `src/data/collections.json` with real
 * data before removing the `demo` marker.
 */
export const CollectionSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  coverPhoto: z.string(),
  productSlugs: z.array(z.string()),
  demo: z.boolean().default(true),
});
export type Collection = z.infer<typeof CollectionSchema>;

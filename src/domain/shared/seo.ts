import { z } from "zod";
import { LocaleContentSchema } from "./locale-content";
import { MediaId } from "./ids";

/**
 * `SEOData` (Prompt 8 §2.2) — shared across catalog (`Product`,
 * `ProductCategory`) and content (`Page`, `Article`, ...) entities, so
 * it lives here in `shared` rather than being redefined per domain
 * area; each domain's `index.ts` re-exports it so `import { SEOData }
 * from "@/domain/content"` still works as the spec's own section
 * listing implies.
 */
export const SEODataSchema = z.object({
  metaTitle: LocaleContentSchema.optional(),
  metaDescription: LocaleContentSchema.optional(),
  focusKeyword: z.string().optional(),
  ogImageId: MediaId.optional(),
  canonicalUrl: z.string().optional(),
  noIndex: z.boolean().default(false),
  /** Additional legacy URLs (beyond the primary `legacyUrl` on `LegacyMetadata`) that should redirect here. */
  oldUrls: z.array(z.string()).optional(),
});
export type SEOData = Readonly<z.infer<typeof SEODataSchema>>;

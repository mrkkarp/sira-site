import { z } from "zod";
import { ArticleId, MediaId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";
import { SEODataSchema } from "../shared/seo";

/** `Article` (Prompt 8 §2.2) — an editorial/blog-style piece (care guides, design notes, press). */
export const ArticleSchema = z.object({
  id: ArticleId,
  slug: z.string().min(1),
  title: LocaleContentSchema,
  excerpt: LocaleContentSchema.optional(),
  body: LocaleContentSchema,
  coverMediaId: MediaId.nullable().optional(),
  tags: z.array(z.string()).optional(),
  publishedAt: z.string().datetime().optional(),
  seo: SEODataSchema.optional(),
});
export type Article = Readonly<z.infer<typeof ArticleSchema>>;

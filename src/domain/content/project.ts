import { z } from "zod";
import { ProjectId, MediaId, ProductId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";
import { SEODataSchema } from "../shared/seo";

/**
 * `Project` + `ProjectCredit` (Prompt 8 §2.2) — a case-study/portfolio
 * entry (`/projects/[slug]`). `ProjectCredit` has no independent ID:
 * it only ever exists embedded in one `Project`'s `credits` array
 * (per §2's "не дублюй" spirit — a bare list of role/name pairs
 * doesn't need to be independently addressable).
 */
export const ProjectCreditSchema = z.object({
  role: LocaleContentSchema,
  name: z.string().min(1),
  url: z.string().optional(),
});
export type ProjectCredit = Readonly<z.infer<typeof ProjectCreditSchema>>;

export const ProjectSchema = z.object({
  id: ProjectId,
  slug: z.string().min(1),
  title: LocaleContentSchema,
  summary: LocaleContentSchema.optional(),
  body: LocaleContentSchema.optional(),
  coverMediaId: MediaId.nullable().optional(),
  galleryMediaIds: z.array(MediaId).optional(),
  credits: z.array(ProjectCreditSchema).optional(),
  featuredProductIds: z.array(ProductId).optional(),
  publishedAt: z.string().datetime().optional(),
  seo: SEODataSchema.optional(),
});
export type Project = Readonly<z.infer<typeof ProjectSchema>>;

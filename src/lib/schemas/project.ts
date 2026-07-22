import { z } from "zod";

/**
 * A completed installation / architect collaboration for `/projects/[slug]`.
 * No real projects are on file yet — this is forward-looking scaffolding.
 * Populate `src/data/projects.json` with real case studies and remove the
 * `demo` marker before publishing.
 */
export const ProjectSchema = z.object({
  slug: z.string(),
  title: z.string(),
  location: z.string(),
  year: z.number().int().optional(),
  summary: z.string(),
  coverPhoto: z.string(),
  gallery: z.array(z.string()).default([]),
  productSlugs: z.array(z.string()).default([]),
  demo: z.boolean().default(true),
});
export type Project = z.infer<typeof ProjectSchema>;

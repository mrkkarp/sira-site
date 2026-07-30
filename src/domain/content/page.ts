import { z } from "zod";
import { PageId, PageBlockId, MediaId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";
import { SEODataSchema } from "../shared/seo";

/**
 * `Page` + `PageBlock` (Prompt 8 §2.2) — mirrors `src/collections/
 * Pages.ts` exactly: only the 3 block types actually implemented there
 * today (Hero/RichText/Spacer) out of the ~30 named in the full admin
 * spec. Adding a block type means adding one variant to this
 * discriminated union *and* one matching Payload `Block` config — the
 * two are meant to move together, not drift.
 */
const pageBlockBase = {
  id: PageBlockId,
  internalLabel: z.string().optional(),
  hideOnMobile: z.boolean().default(false),
  hideOnDesktop: z.boolean().default(false),
};

export const HeroPageBlockSchema = z.object({
  ...pageBlockBase,
  blockType: z.literal("hero"),
  heading: LocaleContentSchema,
  subheading: LocaleContentSchema.optional(),
  imageId: MediaId.optional(),
});
export type HeroPageBlock = Readonly<z.infer<typeof HeroPageBlockSchema>>;

export const RichTextPageBlockSchema = z.object({
  ...pageBlockBase,
  blockType: z.literal("richText"),
  content: LocaleContentSchema,
});
export type RichTextPageBlock = Readonly<
  z.infer<typeof RichTextPageBlockSchema>
>;

export const SpacerSize = z.enum(["sm", "md", "lg", "xl"]);
export type SpacerSize = z.infer<typeof SpacerSize>;

export const SpacerPageBlockSchema = z.object({
  ...pageBlockBase,
  blockType: z.literal("spacer"),
  size: SpacerSize,
});
export type SpacerPageBlock = Readonly<z.infer<typeof SpacerPageBlockSchema>>;

export const PageBlockSchema = z.discriminatedUnion("blockType", [
  HeroPageBlockSchema,
  RichTextPageBlockSchema,
  SpacerPageBlockSchema,
]);
export type PageBlock = HeroPageBlock | RichTextPageBlock | SpacerPageBlock;

export const PageStatus = z.enum([
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);
export type PageStatus = z.infer<typeof PageStatus>;

export const PageSchema = z.object({
  id: PageId,
  title: LocaleContentSchema,
  slug: z.string().min(1),
  status: PageStatus,
  publishAt: z.string().datetime().optional(),
  blocks: z.array(PageBlockSchema),
  seo: SEODataSchema.optional(),
});
export type Page = Readonly<z.infer<typeof PageSchema>>;

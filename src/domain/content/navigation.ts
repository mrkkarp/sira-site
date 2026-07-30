import { z } from "zod";
import { NavigationItemId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";

/** `NavigationItem` (Prompt 8 §2.2) — a self-referencing tree node for header/footer menus, kept independent of `ProductCategory`'s own tree so navigation structure can diverge from catalog structure (e.g. a "Проєкти" menu entry that isn't a category). */
export const NavigationItemSchema = z.object({
  id: NavigationItemId,
  label: LocaleContentSchema,
  href: z.string().min(1),
  parentId: NavigationItemId.nullable().optional(),
  sortOrder: z.number().int().default(0),
  openInNewTab: z.boolean().default(false),
});
export type NavigationItem = Readonly<z.infer<typeof NavigationItemSchema>>;

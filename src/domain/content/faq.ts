import { z } from "zod";
import { FAQItemId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";

/** `FAQItem` (Prompt 8 §2.2) — a single question/answer pair, optionally scoped to a topic group (e.g. "Доставка", "Гарантія") for the `/faq` page's sectioning. */
export const FAQItemSchema = z.object({
  id: FAQItemId,
  question: LocaleContentSchema,
  answer: LocaleContentSchema,
  topic: z.string().optional(),
  sortOrder: z.number().int().default(0),
});
export type FAQItem = Readonly<z.infer<typeof FAQItemSchema>>;

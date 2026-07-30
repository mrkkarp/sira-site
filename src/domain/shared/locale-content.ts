import { z } from "zod";

/**
 * `LocaleContent` (Prompt 8 §2.2) — the one shape every localized text
 * field in the domain layer uses, so mappers/services/UI never invent
 * ad-hoc `{ uk, en, pl }`-shaped objects. `uk` is required (source
 * content is always authored in Ukrainian first); `en`/`pl` are
 * optional because translation coverage lags behind authoring —
 * callers fall back to `uk` explicitly via `resolveLocaleContent()`
 * rather than Zod silently defaulting to an empty string.
 */
export const LocaleContentSchema = z.object({
  uk: z.string(),
  en: z.string().optional(),
  pl: z.string().optional(),
});
export type LocaleContent = Readonly<z.infer<typeof LocaleContentSchema>>;

/** Resolve a `LocaleContent` for a given locale, falling back to `uk` (never silently to an empty string) when the target locale isn't translated yet. */
export function resolveLocaleContent(
  content: LocaleContent,
  locale: "uk" | "en" | "pl",
): string {
  return content[locale] ?? content.uk;
}

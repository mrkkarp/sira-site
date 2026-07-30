import { z } from "zod";

/**
 * `TranslationStatus` — per-locale review tracker for translated
 * content, NOT a parallel content store.
 *
 * Prompt 8 §3.1 lists a `translations` table alongside `products`,
 * `pages`, etc. Payload already stores the actual translated text
 * natively via `localized: true` fields (uk/en/pl) on every relevant
 * collection — duplicating that into a second normalized table would
 * mean two places holding the same string, with no way to keep them
 * in sync (exactly what §0's "не дублюй дані" rule warns against).
 *
 * What genuinely doesn't exist yet is a way for a Translator to see
 * "this record's `en` copy hasn't been reviewed since the `uk` source
 * changed" — that's a workflow status, not a copy of the text. This
 * lightweight schema is that status, meant to be attached (e.g. as a
 * `translationStatus` group field per translatable collection in
 * Phase B) alongside the existing localized fields, not instead of
 * them.
 */
export const TranslationReviewState = z.enum([
  "notNeeded",
  "needsTranslation",
  "inProgress",
  "reviewed",
  "outdated",
]);
export type TranslationReviewState = z.infer<typeof TranslationReviewState>;

// Every locale except `uk` (the always-authored source language) needs
// a review status. Hardcoded rather than derived from `@/i18n/config`'s
// `locales` tuple: that list is a UI-routing concern (which locales
// have live routes today) while this is a translation-workflow
// concern — the two happen to match today but aren't the same axis.
const TranslatableLocale = z.enum(["en", "pl"]);
export type TranslatableLocale = z.infer<typeof TranslatableLocale>;

export const TranslationStatusSchema = z.record(
  TranslatableLocale,
  TranslationReviewState,
);
export type TranslationStatus = Readonly<
  z.infer<typeof TranslationStatusSchema>
>;

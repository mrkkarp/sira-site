import { z } from "zod";
import { LeadId } from "../shared/ids";
import { LeadStatus } from "./lead-status";

/**
 * `LeadSubmissionLocale` — which storefront locale the form was
 * submitted from, for staff context (e.g. reply in the customer's
 * language) and for analytics. Deliberately a plain local enum, not an
 * import from `@/i18n/config`: same reasoning as `TranslatableLocale`
 * in `shared/translation-status.ts` — this is a "what did the customer
 * see" fact captured at submission time, not the app's routing config,
 * even though the values happen to coincide today.
 */
export const LeadSubmissionLocale = z.enum(["uk", "en", "pl"]);
export type LeadSubmissionLocale = z.infer<typeof LeadSubmissionLocale>;

/**
 * Fields common to every `LeadRequest` variant (Prompt 8 §12, §15.2).
 * Spread into each concrete lead schema rather than used as a nested
 * `common: {...}` object, so every lead type is still a flat object at
 * the top level — simpler for the discriminated union and for Payload's
 * `Leads` collection (Phase B) to store as one flat table with a `type`
 * select field.
 */
export const leadCommonFields = {
  id: LeadId,
  status: LeadStatus,
  locale: LeadSubmissionLocale,
  /** The page path the form was submitted from (e.g. `/products/odri-60`), for staff context — never a full URL with query params, to avoid accidentally capturing PII-bearing tracking params. */
  sourcePath: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};

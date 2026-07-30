import { z } from "zod";

/**
 * `LeadStatus` (Prompt 8 §15.2) — the sales-workflow state of any
 * `LeadRequest`, regardless of which of the six form types created it.
 * One shared status enum (not six per-type ones) because staff triage
 * every lead type through the same admin queue.
 */
export const LeadStatus = z.enum([
  "new",
  "inProgress",
  "waitingForCustomer",
  "quoted",
  "won",
  "lost",
  "spam",
  "closed",
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

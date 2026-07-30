import { z } from "zod";
import { ContactRequestSchema } from "./contact-request";
import { CallbackRequestSchema } from "./callback-request";
import { QuoteRequestSchema } from "./quote-request";
import { DesignerRequestSchema } from "./designer-request";
import { WarrantyRequestSchema } from "./warranty-request";
import { SampleRequestSchema } from "./sample-request";

/**
 * `LeadRequest` (Prompt 8 §2.4, §3.1) — the six form submissions,
 * unified as one discriminated union on `type` rather than six
 * unrelated types, per the spec's "Leads — одна таблиця" requirement:
 * one `Leads` Payload collection (Phase B) stores every submission,
 * and the admin queue/staff triage works across all of them uniformly.
 */
export const LeadRequestSchema = z.discriminatedUnion("type", [
  ContactRequestSchema,
  CallbackRequestSchema,
  QuoteRequestSchema,
  DesignerRequestSchema,
  WarrantyRequestSchema,
  SampleRequestSchema,
]);
export type LeadRequest = Readonly<z.infer<typeof LeadRequestSchema>>;

export type LeadRequestType = LeadRequest["type"];

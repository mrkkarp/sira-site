import type { NextRequest } from "next/server";
import { z } from "zod";
import { PhoneNumber } from "@/domain/shared/phone";
import { ProjectTimeline, ProjectType } from "@/domain/leads/lead-common";
import {
  handleLeadSubmission,
  type LeadEndpointResponse,
} from "@/lib/forms/lead-endpoint";

export type DesignerRequestResponse = LeadEndpointResponse;

/**
 * The architect/designer enquiry on `/designers`.
 *
 * Commercially the most valuable submission on the site: one designer
 * specifying these products carries a project's worth of units rather than
 * one. That is why `email` is required here and optional everywhere else —
 * a trade conversation runs on drawings, specifications and quotations sent
 * as attachments, and a phone number alone cannot receive any of them.
 *
 * `portfolioUrl` is stored as free text, not as `z.string().url()`. A
 * designer typing `behance.net/name` without a scheme is giving a perfectly
 * usable answer, and rejecting the most valuable lead on the site over a
 * missing `https://` would be the validation working against the business.
 */
const DesignerFormInput = z.object({
  name: z.string().trim().min(1),
  phone: PhoneNumber,
  email: z.string().trim().email(),
  companyName: z.string().trim().optional().or(z.literal("")),
  portfolioUrl: z.string().trim().optional().or(z.literal("")),
  message: z.string().trim().optional().or(z.literal("")),
  /**
   * The two qualification answers, both optional (`qualification.ts`).
   *
   * A strict enum rather than free text, so the stored value can be grouped in
   * the admin panel and in GA4 without cleaning. The client omits the key
   * entirely when the question was skipped — an empty string is deliberately
   * *not* accepted here, because silently coercing `""` to "no answer" is how a
   * front-end bug that stops sending real answers goes unnoticed for a month.
   */
  projectType: ProjectType.optional(),
  timeline: ProjectTimeline.optional(),
});

export async function POST(request: NextRequest) {
  return handleLeadSubmission({
    request,
    form: "designer",
    schema: DesignerFormInput,
    toLead: (input, { locale, sourcePath }) => ({
      type: "designer",
      status: "new",
      locale,
      sourcePath,
      name: input.name,
      phone: input.phone,
      email: input.email,
      companyName: input.companyName || undefined,
      portfolioUrl: input.portfolioUrl || undefined,
      message: input.message || undefined,
      projectType: input.projectType,
      timeline: input.timeline,
    }),
  });
}

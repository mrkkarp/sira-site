import type { NextRequest } from "next/server";
import { z } from "zod";
import { PhoneNumber } from "@/domain/shared/phone";
import {
  handleLeadSubmission,
  type LeadEndpointResponse,
} from "@/lib/forms/lead-endpoint";

export type ContactRequestResponse = LeadEndpointResponse;

/**
 * The general "Звʼяжіться з нами" form on `/contact`.
 *
 * Mirrors `ContactRequestSchema` in `src/domain/leads/contact-request.ts`,
 * with `PhoneNumber` doing the real validating rather than a bare
 * `min(7)` — the client-side guard uses the same schema, so a number the
 * form accepted is a number this route accepts, and the two cannot drift
 * into the state where the browser says yes and the server says no.
 */
const ContactFormInput = z.object({
  name: z.string().trim().min(1),
  phone: PhoneNumber,
  email: z.string().trim().email().optional().or(z.literal("")),
  message: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  return handleLeadSubmission({
    request,
    form: "contact",
    schema: ContactFormInput,
    toLead: (input, { locale, sourcePath }) => ({
      type: "contact",
      status: "new",
      locale,
      sourcePath,
      name: input.name,
      phone: input.phone,
      // An empty string is what an untouched optional input posts. Stored as
      // `undefined` instead, so "no email given" is one state in the database
      // rather than two that staff and any future export have to know about.
      email: input.email || undefined,
      message: input.message,
    }),
  });
}

"use client";

import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";
import { EVENT_ID_FIELD, newEventId } from "@/lib/forms/event-id";

export type LeadFormStatus = "idle" | "submitting" | "success" | "error";

/** Field name → the message to show against it. Empty means "send it". */
export type LeadFormErrors = Record<string, string>;

/**
 * The submit half of a lead form: validate, post, and only then report the
 * conversion.
 *
 * Three things live here because all three are worth exactly one
 * implementation:
 *
 *   1. **The conversion fires after the server said yes.** `onAccepted` runs
 *      on a 2xx and nowhere else. Counting on submit instead would fold every
 *      validation rejection, rate-limited retry and offline attempt into the
 *      number Google Ads is bidding against — the site would look like it
 *      generates leads it never received, and the campaign would spend
 *      accordingly.
 *   2. **Focus moves to the first invalid field.** The `aria-live` status line
 *      at the bottom of these forms only speaks for the network path, so a
 *      validation failure otherwise produces no announcement at all: a screen
 *      reader user presses submit and nothing happens (WCAG 3.3.1).
 *   3. **The honeypot travels with every submission.** It is one line, and a
 *      form that forgets it is not broken — it just quietly accepts bots.
 *   4. **One `event_id` per submission, sent both ways.** Meta receives this
 *      lead twice on purpose — from the pixel in the browser and from our own
 *      server via the Conversions API — and collapses the pair back into one
 *      lead only if both copies carry the same id. The browser is the only
 *      place that can hand the same value to the request body and to the
 *      dataLayer push, and a per-form implementation would be four separate
 *      chances to double-count every lead.
 *
 * `validate` is a plain function rather than a Zod schema on purpose. A schema
 * would read better and would drag zod's ~277 kB runtime into three pages that
 * render their form immediately — see `src/lib/forms/field-rules.ts`, and
 * `src/lib/client-bundle.test.ts`, which fails the build over exactly that.
 */
export function useLeadForm({
  endpoint,
  validate,
  fieldRefs,
  onAccepted,
}: {
  endpoint: string;
  /**
   * Returns a message per invalid field, keyed by field name. An empty object
   * means the form is valid and may be posted.
   */
  validate: (values: Record<string, string>) => LeadFormErrors;
  /** Focus targets, keyed by field name, in the order the form renders them. */
  fieldRefs: Record<string, RefObject<HTMLElement | null>>;
  /**
   * Called once the endpoint accepted the submission. This is where the
   * conversion event goes.
   *
   * Receives the `event_id` that was just sent to the server with this same
   * submission; pass it straight through to the `track*` call so the pixel and
   * the Conversions API agree on which lead this is.
   *
   * May be async: Enhanced Conversions has to hash the visitor's contact
   * details, and `crypto.subtle.digest` returns a promise. It is awaited so the
   * event cannot be pushed after the visitor has already navigated away, but
   * see below for why its failure is contained.
   */
  onAccepted?: (eventId: string) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<LeadFormStatus>("idle");
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const honeypotRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    async (
      values: Record<string, string>,
      extraBody?: Record<string, unknown>,
    ): Promise<boolean> => {
      const nextErrors = validate(values);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        setStatus("error");
        // `fieldRefs` is ordered by the form's own render order, so the first
        // key that errored is the first invalid field on screen — not merely
        // whichever check happened to run first.
        const firstInvalid = Object.keys(fieldRefs).find(
          (field) => nextErrors[field],
        );
        if (firstInvalid) fieldRefs[firstInvalid]?.current?.focus();
        return false;
      }

      setErrors({});
      setStatus("submitting");
      // Minted per accepted-for-sending submission, not per mount: a customer
      // who fixes a validation error and submits again is still one lead, but a
      // customer who fills the form in twice is two, and reusing an id across
      // those would make Meta discard the second as a duplicate of the first.
      const eventId = newEventId();
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            ...extraBody,
            [EVENT_ID_FIELD]: eventId,
            [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
          }),
        });
        if (!response.ok) throw new Error("request_failed");
        setStatus("success");
      } catch {
        setStatus("error");
        return false;
      }

      // Outside the try above, and with a try of its own, because by this point
      // the lead is saved. Measurement must not be able to tell the customer
      // their enquiry failed: a throw in here — a tag helper, a hashing call —
      // would otherwise be caught by the network handler, flip the form to its
      // error state, and invite a duplicate submission for a lead that arrived
      // perfectly well the first time.
      try {
        await onAccepted?.(eventId);
      } catch (error) {
        console.error("[forms] the lead was accepted but not measured", error);
      }
      return true;
    },
    [endpoint, validate, fieldRefs, onAccepted],
  );

  return { status, errors, honeypotRef, submit };
}

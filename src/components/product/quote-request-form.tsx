"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import { PhoneNumber } from "@/domain/shared/phone";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product, ProductVariant } from "@/lib/schemas/product";
import { trackQuoteRequest } from "@/lib/analytics/events";
import { hashUserData } from "@/lib/analytics/user-data";
import {
  projectTypeOptions,
  qualificationBody,
  timelineOptions,
} from "@/lib/forms/qualification-fields";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { HoneypotField } from "@/components/forms/honeypot-field";
import { SelectField } from "@/components/forms/form-field";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";

type Status = "idle" | "submitting" | "success" | "error";
type FieldErrors = { name?: string; phone?: string };

/** Loose client-side guard, mirrors `QuoteFormInput` in `/api/quote/route.ts`. */
const QuoteFormFields = z.object({
  name: z.string().trim().min(1),
  phone: PhoneNumber,
});

/**
 * "Отримати прорахунок" (get a quote) form for custom/individual-order
 * configurations (Prompt 6 §6). Posts to its own `quote`-type endpoint,
 * `/api/quote` (Phase E), carrying the real selected `productId`/
 * `variantId` alongside `context` — a real, non-fabricated summary of the
 * selected product/variant, sent as the lead's required `message` — so
 * staff and any future CRM integration get both the structured reference
 * and the readable summary, never invented content.
 *
 * This is never shown alongside a "Add to cart" CTA for the same product —
 * callers choose one or the other based on whether the product has a real,
 * orderable variant combination.
 */
export function QuoteRequestForm({
  dictionary,
  context,
  product,
  variant,
}: {
  dictionary: Dictionary;
  /** Real product/variant summary, e.g. "Odri (Odri color), колір: Свій колір" — sent as the lead's `message`. */
  context: string;
  /**
   * The real catalogue objects, not their ids.
   *
   * They used to be a `productId?`/`variantId?` pair of strings, which was
   * everything `/api/quote` needs — but `quote_request` is the site's main
   * conversion, and Google Ads bids toward its `value`, which is the price of
   * the variant the visitor actually had selected. `Odri` is 19 600 UAH and
   * `Odri color` is 23 400; a string SKU cannot tell them apart.
   *
   * Both are required rather than optional so the event cannot be silently
   * skipped: there is no branch of this form that submits without a product
   * behind it, and making that a type error is cheaper than discovering a
   * missing conversion in the Ads UI three weeks later. `productId` and
   * `variantId` are derived from them below, so the request body is unchanged.
   */
  product: Product;
  variant: ProductVariant;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // Both optional and both starting blank — see `qualification.ts`. This form
  // is the site's main conversion and used to be two fields; the two selects
  // are added below the required pair, visibly labelled as skippable, so the
  // shortest path through it is exactly as short as it was.
  const [projectType, setProjectType] = useState("");
  const [timeline, setTimeline] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const baseId = useId();
  const honeypotRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = QuoteFormFields.safeParse({ name, phone });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "name" && !nextErrors.name) {
          // `name` is `min(1)` after a trim, so the only failure is an
          // empty one. The old ternary's other arm was `invalidPhone` —
          // unreachable, and about a different field.
          nextErrors.name = dictionary.leadFields.requiredName;
        }
        if (issue.path[0] === "phone" && !nextErrors.phone) {
          nextErrors.phone = phone.trim()
            ? dictionary.leadFields.invalidPhone
            : dictionary.leadFields.requiredPhone;
        }
      }
      setErrors(nextErrors);
      setStatus("error");
      // Prompt 9 §2 (accessibility audit) — the `aria-live` status line
      // below only speaks for the network-failure path, so a field
      // validation failure produced no announcement at all. Moving focus
      // to the first invalid field makes the screen reader announce that
      // field's name + invalid state + linked error text (SC 3.3.1).
      (nextErrors.name ? nameRef : phoneRef).current?.focus();
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          message: context,
          productId: product.slug,
          variantId: variant.sku,
          ...qualificationBody(projectType, timeline),
          [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
        }),
      });
      if (!response.ok) throw new Error("request_failed");
      setStatus("success");
    } catch {
      setStatus("error");
      return;
    }

    // Everything below runs only once the lead is safely saved, and outside the
    // try above so that a failure in measurement cannot present itself to the
    // customer as a failed enquiry — see the same note in `use-lead-form.ts`.
    //
    // After the server accepted it, never before. A `quote_request` counted on
    // submit would include every validation rejection and every network failure
    // — inflating the one number the campaign is optimising toward.
    try {
      // This form asks for a phone and no email, so Enhanced Conversions has
      // one match key here rather than two. Still worth sending: a phone number
      // is exactly what a customer signed into Google on their own handset is
      // matchable by.
      const userData = await hashUserData({ phone: parsed.data.phone });
      trackQuoteRequest(product, variant, {
        ...qualificationBody(projectType, timeline),
        userData,
      });
    } catch (error) {
      console.error("[quote] the lead was accepted but not measured", error);
    }

    setName("");
    setPhone("");
    setProjectType("");
    setTimeline("");
  }

  const inputClass =
    "border-border-strong bg-background text-text placeholder:text-text-muted type-body-sm h-11 w-full border px-(--space-sm) outline-none disabled:opacity-60";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-(--space-2xs)"
    >
      <HoneypotField ref={honeypotRef} />
      <p className="type-body-sm text-text-muted">
        {dictionary.product.requestQuoteIntro}
      </p>

      <div>
        <VisuallyHidden as="label" htmlFor={`${baseId}-name`}>
          <span>{dictionary.leadFields.nameLabel}</span>
        </VisuallyHidden>
        <input
          ref={nameRef}
          id={`${baseId}-name`}
          type="text"
          // Both fields are required and neither said so to anyone but a
          // sighted user reading the error after the fact — this form has no
          // visible "*" and, being `noValidate`, no browser prompt either.
          // `required` is semantics only here; `handleSubmit` still does all
          // the validating (WCAG 3.3.2).
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={dictionary.leadFields.nameLabel}
          disabled={status === "submitting"}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${baseId}-name-error` : undefined}
          className={inputClass}
        />
        {errors.name ? (
          <p
            id={`${baseId}-name-error`}
            className="type-caption text-error mt-(--space-3xs)"
          >
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <VisuallyHidden as="label" htmlFor={`${baseId}-phone`}>
          <span>{dictionary.leadFields.phoneLabel}</span>
        </VisuallyHidden>
        <input
          ref={phoneRef}
          id={`${baseId}-phone`}
          type="tel"
          required
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={dictionary.leadFields.phonePlaceholder}
          disabled={status === "submitting"}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? `${baseId}-phone-error` : undefined}
          className={inputClass}
        />
        {errors.phone ? (
          <p
            id={`${baseId}-phone-error`}
            className="type-caption text-error mt-(--space-3xs)"
          >
            {errors.phone}
          </p>
        ) : null}
      </div>

      {/*
        The two qualification questions. Unlike the fields above they carry
        visible labels — a select showing "Не вказувати" with no label beside
        it is a control whose purpose nobody can guess, and a placeholder-only
        pattern that works for "Ім'я" does not work for a dropdown.
      */}
      <p className="type-caption text-text-muted mt-(--space-3xs)">
        {dictionary.leadQualification.note}
      </p>
      <SelectField
        id={`${baseId}-project-type`}
        label={dictionary.leadQualification.projectTypeLabel}
        value={projectType}
        onChange={setProjectType}
        options={projectTypeOptions(dictionary)}
        placeholder={dictionary.leadQualification.unset}
        disabled={status === "submitting"}
      />
      <SelectField
        id={`${baseId}-timeline`}
        label={dictionary.leadQualification.timelineLabel}
        value={timeline}
        onChange={setTimeline}
        options={timelineOptions(dictionary)}
        placeholder={dictionary.leadQualification.unset}
        disabled={status === "submitting"}
      />

      <Button
        type="submit"
        variant="primary-dark"
        disabled={status === "submitting"}
        className="self-start"
      >
        {status === "submitting"
          ? dictionary.product.requestQuoteSendingCta
          : dictionary.product.requestQuoteCta}
      </Button>

      <p aria-live="polite" className="type-caption min-h-[1.4em]">
        {status === "success" ? (
          <span className="text-text-muted">
            {dictionary.product.requestQuoteSuccess}
          </span>
        ) : null}
        {status === "error" && !errors.name && !errors.phone ? (
          <span className="text-error">
            {dictionary.product.requestQuoteError}
          </span>
        ) : null}
      </p>
    </form>
  );
}

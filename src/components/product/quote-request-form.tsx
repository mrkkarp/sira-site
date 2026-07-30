"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { HoneypotField } from "@/components/forms/honeypot-field";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";

type Status = "idle" | "submitting" | "success" | "error";
type FieldErrors = { name?: string; phone?: string };

/** Loose client-side guard, mirrors `QuoteFormInput` in `/api/quote/route.ts`. */
const QuoteFormFields = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(7),
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
  productId,
  variantId,
}: {
  dictionary: Dictionary;
  /** Real product/variant summary, e.g. "Odri (Odri color), колір: Свій колір" — sent as the lead's `message`. */
  context: string;
  /** Real product slug, when the request is tied to an existing catalog product. */
  productId?: string;
  /** Real variant SKU, when the request is tied to a specific existing variant. */
  variantId?: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
          nextErrors.name = name.trim()
            ? dictionary.callback.invalidPhone
            : dictionary.callback.requiredName;
        }
        if (issue.path[0] === "phone" && !nextErrors.phone) {
          nextErrors.phone = phone.trim()
            ? dictionary.callback.invalidPhone
            : dictionary.callback.requiredPhone;
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
          productId,
          variantId,
          [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
        }),
      });
      if (!response.ok) throw new Error("request_failed");
      setStatus("success");
      setName("");
      setPhone("");
    } catch {
      setStatus("error");
    }
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
          <span>{dictionary.callback.nameLabel}</span>
        </VisuallyHidden>
        <input
          ref={nameRef}
          id={`${baseId}-name`}
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={dictionary.callback.nameLabel}
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
          <span>{dictionary.callback.phoneLabel}</span>
        </VisuallyHidden>
        <input
          ref={phoneRef}
          id={`${baseId}-phone`}
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={dictionary.callback.phonePlaceholder}
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

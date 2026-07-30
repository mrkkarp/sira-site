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

/**
 * Same loose client-side shape the `/api/callback` route validates
 * server-side (see `CallbackFormInput` there) — this only guards against
 * empty/garbage input before a real network round-trip, the server copy
 * is the actual source of truth.
 */
const CallbackFormFields = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(7),
});

/**
 * "Замовити дзвінок" (request a call) form, shown in the footer's ODUDLAB
 * column. Posts to `/api/callback` (Phase E), which persists a real
 * `callback`-type lead and notifies staff — see that route for details.
 * Input is kept on error, same rule as the newsletter form.
 */
export function CallbackForm({ dictionary }: { dictionary: Dictionary }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const phoneId = `${baseId}-phone`;
  const honeypotRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = CallbackFormFields.safeParse({ name, phone });
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
      const response = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
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

  // Prompt 9 §2 (accessibility audit) — `/30` alpha over the dark footer
  // only blended to ~2.5:1 (fails WCAG 1.4.11's 3:1 non-text-contrast
  // minimum for the input's only visible boundary); `/50` blends to ~4.4:1.
  const inputClass =
    "border-background/50 bg-background/5 text-background placeholder:text-background/40 type-body-sm h-11 w-full border px-(--space-sm) outline-none disabled:opacity-60";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-(--space-sm) flex flex-col gap-(--space-2xs)"
    >
      <h3 className="type-technical-label text-background/60">
        {dictionary.callback.heading}
      </h3>

      <HoneypotField ref={honeypotRef} />

      <div>
        <VisuallyHidden as="label" htmlFor={nameId}>
          <span>{dictionary.callback.nameLabel}</span>
        </VisuallyHidden>
        <input
          ref={nameRef}
          id={nameId}
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
            className="type-caption text-error-on-dark mt-(--space-3xs)"
          >
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <VisuallyHidden as="label" htmlFor={phoneId}>
          <span>{dictionary.callback.phoneLabel}</span>
        </VisuallyHidden>
        <input
          ref={phoneRef}
          id={phoneId}
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
            className="type-caption text-error-on-dark mt-(--space-3xs)"
          >
            {errors.phone}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="primary-light"
        size="sm"
        disabled={status === "submitting"}
        className="self-start"
      >
        {status === "submitting"
          ? dictionary.callback.submittingCta
          : dictionary.callback.submitCta}
      </Button>

      <p aria-live="polite" className="type-caption min-h-[1.4em]">
        {status === "success" ? (
          <span className="text-background/70">
            {dictionary.callback.successMessage}
          </span>
        ) : null}
        {status === "error" && !errors.name && !errors.phone ? (
          <span className="text-error-on-dark">
            {dictionary.callback.errorMessage}
          </span>
        ) : null}
      </p>
    </form>
  );
}

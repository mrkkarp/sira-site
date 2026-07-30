"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { NewsletterSubscribeSchema } from "@/lib/schemas/newsletter";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { HoneypotField } from "@/components/forms/honeypot-field";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Above-the-footer newsletter block, dark "production mode" section.
 * No email-marketing provider is connected — see `src/app/api/newsletter/route.ts`
 * for the mock endpoint this posts to. On error, the entered email is kept
 * (never cleared) so the visitor doesn't have to retype it.
 */
export function Newsletter({ dictionary }: { dictionary: Dictionary }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const baseId = useId();
  const inputId = `${baseId}-email`;
  const errorId = `${baseId}-error`;
  const statusId = `${baseId}-status`;
  const honeypotRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = NewsletterSubscribeSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(
        email.trim()
          ? dictionary.newsletter.invalidEmail
          : dictionary.newsletter.requiredEmail,
      );
      setStatus("error");
      // Prompt 9 §2 (accessibility audit) — the `aria-live` status line
      // below only speaks for the network-failure path, so a field
      // validation failure produced no announcement at all. Moving focus
      // to the invalid field makes the screen reader announce its name +
      // invalid state + linked error text (SC 3.3.1).
      emailRef.current?.focus();
      return;
    }

    setFieldError(undefined);
    setStatus("submitting");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
        }),
      });
      if (!response.ok) throw new Error("request_failed");
      setStatus("success");
      setEmail("");
    } catch {
      // Deliberately not clearing `email` here — a failed submission
      // shouldn't make the visitor retype their address.
      setStatus("error");
    }
  }

  const showFieldError = status === "error" && fieldError;
  const showGenericError = status === "error" && !fieldError;

  return (
    <div>
      <p className="type-eyebrow text-background/60">
        {dictionary.newsletter.eyebrow}
      </p>
      <h2 className="type-h2 text-background mt-(--space-2xs) max-w-md font-serif">
        {dictionary.newsletter.heading}
      </h2>
      <p className="type-body text-background/70 mt-(--space-2xs) max-w-md">
        {dictionary.newsletter.body}
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-(--space-sm) flex flex-col gap-(--space-xs) sm:max-w-md sm:flex-row sm:items-start"
      >
        <HoneypotField ref={honeypotRef} />
        <div className="flex-1">
          <VisuallyHidden as="label" htmlFor={inputId}>
            <span>{dictionary.newsletter.emailLabel}</span>
          </VisuallyHidden>
          <input
            ref={emailRef}
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={dictionary.newsletter.emailPlaceholder}
            disabled={status === "submitting"}
            aria-invalid={Boolean(showFieldError)}
            aria-describedby={showFieldError ? errorId : undefined}
            // Prompt 9 §2 (accessibility audit) — `/30` alpha over the dark
            // footer only blended to ~2.5:1 (fails WCAG 1.4.11's 3:1
            // non-text-contrast minimum for the input's only visible
            // boundary); `/50` blends to ~4.4:1.
            className="border-background/50 bg-background/5 text-background placeholder:text-background/40 type-body-sm h-11 w-full border px-(--space-sm) outline-none disabled:opacity-60"
          />
          {showFieldError ? (
            <p
              id={errorId}
              className="type-caption text-error-on-dark mt-(--space-3xs)"
            >
              {fieldError}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          variant="primary-light"
          disabled={status === "submitting"}
        >
          {status === "submitting"
            ? dictionary.newsletter.submittingCta
            : dictionary.newsletter.submitCta}
        </Button>
      </form>

      <p className="type-caption text-background/50 mt-(--space-2xs) max-w-md">
        {dictionary.newsletter.privacyNote}
      </p>

      <p
        id={statusId}
        aria-live="polite"
        className="type-body-sm mt-(--space-2xs) min-h-[1.5em]"
      >
        {status === "success" ? (
          <span className="text-background">
            {dictionary.newsletter.successMessage}
          </span>
        ) : null}
        {showGenericError ? (
          <span className="text-error-on-dark">
            {dictionary.newsletter.errorMessage}
          </span>
        ) : null}
      </p>
    </div>
  );
}

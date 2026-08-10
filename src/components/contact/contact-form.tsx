"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { trackContactSubmit } from "@/lib/analytics/events";
import { hashUserData } from "@/lib/analytics/user-data";
import { useLeadForm, type LeadFormErrors } from "@/lib/forms/use-lead-form";
import {
  isBlank,
  isBlankOr,
  isValidEmail,
  isValidPhoneNumber,
} from "@/lib/forms/field-rules";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/forms/honeypot-field";
import { TextAreaField, TextField } from "@/components/forms/form-field";

/**
 * The general enquiry form on `/contact`.
 *
 * A Client Component leaf deliberately dropped into a Server Component page:
 * `ContactContent` around it stays server-rendered, so the phone number,
 * address, opening note and every heading are still in the HTML that arrives
 * before any JavaScript. Only this form hydrates.
 *
 * `email` is optional while `phone` is not, which is the right way round for
 * this market: the workshop replies by phone or Viber, and a required email
 * would cost real enquiries in exchange for a channel nobody here uses.
 */
export function ContactForm({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.contactForm;
  const baseId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const fieldRefs = useMemo(
    () => ({
      name: nameRef,
      phone: phoneRef,
      email: emailRef,
      message: messageRef,
    }),
    [],
  );

  /**
   * Mirrors `ContactFormInput` in `/api/contact/route.ts`, field for field —
   * `email` optional there and here, `message` required in both. A client that
   * is stricter than the server turns away leads the API would have taken; one
   * that is looser answers a real customer with an opaque 400.
   */
  const validate = useCallback(
    (values: Record<string, string>): LeadFormErrors => {
      const errors: LeadFormErrors = {};
      if (isBlank(values.name)) errors.name = dictionary.leadFields.requiredName;
      if (isBlank(values.phone)) {
        errors.phone = dictionary.leadFields.requiredPhone;
      } else if (!isValidPhoneNumber(values.phone)) {
        errors.phone = dictionary.leadFields.invalidPhone;
      }
      if (!isBlankOr(values.email, isValidEmail)) {
        errors.email = dictionary.leadFields.invalidEmail;
      }
      if (isBlank(values.message)) errors.message = copy.requiredMessage;
      return errors;
    },
    [dictionary, copy],
  );

  const onAccepted = useCallback(
    async (eventId: string) => {
      // Email is optional on this form, so many of these carry a phone hash
      // only — which is still a match key, and still better than nothing.
      const userData = await hashUserData({ email, phone });
      // `eventId` is the same value the POST body just carried to the server,
      // which is what lets Meta collapse the pixel's copy of this lead and the
      // Conversions API's copy into one. See `lib/forms/event-id.ts`.
      trackContactSubmit({ location: "contact_page", userData, eventId });
    },
    [email, phone],
  );

  const { status, errors, honeypotRef, submit } = useLeadForm({
    endpoint: "/api/contact",
    validate,
    fieldRefs,
    onAccepted,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accepted = await submit({ name, phone, email, message });
    if (!accepted) return;
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
  }

  const busy = status === "submitting";
  const hasFieldError = Object.keys(errors).length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-(--space-sm)"
    >
      <HoneypotField ref={honeypotRef} />

      <TextField
        id={`${baseId}-name`}
        label={dictionary.leadFields.nameLabel}
        value={name}
        onChange={setName}
        autoComplete="name"
        required
        disabled={busy}
        error={errors.name}
        inputRef={nameRef}
      />
      <TextField
        id={`${baseId}-phone`}
        label={dictionary.leadFields.phoneLabel}
        type="tel"
        value={phone}
        onChange={setPhone}
        autoComplete="tel"
        placeholder={dictionary.leadFields.phonePlaceholder}
        required
        disabled={busy}
        error={errors.phone}
        inputRef={phoneRef}
      />
      <TextField
        id={`${baseId}-email`}
        label={copy.emailLabel}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        hint={copy.emailHint}
        disabled={busy}
        error={errors.email}
        inputRef={emailRef}
      />
      <TextAreaField
        id={`${baseId}-message`}
        label={copy.messageLabel}
        value={message}
        onChange={setMessage}
        placeholder={copy.messagePlaceholder}
        required
        disabled={busy}
        error={errors.message}
        inputRef={messageRef}
      />

      <Button
        variant="accent"
        type="submit"
        disabled={busy}
        className="self-start"
      >
        {busy ? copy.submittingCta : copy.submitCta}
      </Button>

      <p aria-live="polite" className="type-body-sm min-h-[1.4em]">
        {status === "success" ? (
          <span className="text-text">{copy.successMessage}</span>
        ) : null}
        {/*
          Only when no field error is showing. A failed validation already
          announced itself by moving focus onto the offending field, and adding
          "something went wrong, try again" on top of that says nothing true —
          nothing went wrong with the network.
        */}
        {status === "error" && !hasFieldError ? (
          <span className="text-error">{copy.errorMessage}</span>
        ) : null}
      </p>
    </form>
  );
}

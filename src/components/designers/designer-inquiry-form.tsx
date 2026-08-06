"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { trackDesignerInquiry } from "@/lib/analytics/events";
import { hashUserData } from "@/lib/analytics/user-data";
import { useLeadForm, type LeadFormErrors } from "@/lib/forms/use-lead-form";
import {
  isBlank,
  isValidEmail,
  isValidPhoneNumber,
} from "@/lib/forms/field-rules";
import {
  projectTypeOptions,
  qualificationBody,
  timelineOptions,
} from "@/lib/forms/qualification-fields";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/forms/honeypot-field";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/forms/form-field";

/**
 * The architect/designer enquiry — one of the two main conversions.
 *
 * `email` is required here and optional on every other form on the site. That
 * is not an inconsistency: a trade conversation is drawings, specifications
 * and a quotation, all of which are attachments, and a phone number cannot
 * receive an attachment. The extra field costs some submissions and is meant
 * to — the goal is a small number of enquiries from people actually
 * specifying for a project, not the largest possible pile.
 */
export function DesignerInquiryForm({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.designersPage;
  const baseId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [message, setMessage] = useState("");
  // The two qualification answers. `""` is "not answered" and is the initial
  // state, so the form opens with nothing pre-selected — a default would put
  // an answer the visitor never gave into the CRM and into the conversion.
  const [projectType, setProjectType] = useState("");
  const [timeline, setTimeline] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const portfolioRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const fieldRefs = useMemo(
    () => ({
      name: nameRef,
      phone: phoneRef,
      email: emailRef,
      companyName: companyRef,
      portfolioUrl: portfolioRef,
      message: messageRef,
    }),
    [],
  );

  /**
   * Mirrors `DesignerFormInput` in `/api/designer/route.ts`, field for field.
   * The missing-vs-malformed split on `email` is the point of doing this by
   * hand: "вкажіть email — на нього надішлемо креслення" explains why the field
   * is there at all, which "введіть коректну адресу" does not.
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
      if (isBlank(values.email)) {
        errors.email = copy.requiredEmail;
      } else if (!isValidEmail(values.email)) {
        errors.email = dictionary.leadFields.invalidEmail;
      }
      return errors;
    },
    [dictionary, copy],
  );

  /**
   * The qualification answers ride along on the conversion, not just into the
   * database. Judging this campaign by cost per lead is the mistake the brief
   * is written against — what matters is whether the leads are people with a
   * project — and that question can only be asked in GA4 if the answer is a
   * parameter on the event itself.
   */
  const onAccepted = useCallback(async () => {
    // Hashed here, from the values still in state, because this is the one
    // moment both halves exist: the lead is confirmed saved and the fields have
    // not been cleared yet. See `analytics/user-data.ts` — the plaintext never
    // reaches the dataLayer.
    const userData = await hashUserData({ email, phone });
    trackDesignerInquiry({
      location: "designers_page",
      ...qualificationBody(projectType, timeline),
      userData,
    });
  }, [email, phone, projectType, timeline]);

  const { status, errors, honeypotRef, submit } = useLeadForm({
    endpoint: "/api/designer",
    validate,
    fieldRefs,
    onAccepted,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accepted = await submit(
      { name, phone, email, companyName, portfolioUrl, message },
      // Not part of `values`: those are all strings the validator inspects, and
      // an unanswered select must be absent from the body rather than `""`.
      qualificationBody(projectType, timeline),
    );
    if (!accepted) return;
    setName("");
    setPhone("");
    setEmail("");
    setCompanyName("");
    setPortfolioUrl("");
    setMessage("");
    setProjectType("");
    setTimeline("");
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
        required
        disabled={busy}
        error={errors.email}
        inputRef={emailRef}
      />
      <TextField
        id={`${baseId}-company`}
        label={copy.companyLabel}
        value={companyName}
        onChange={setCompanyName}
        autoComplete="organization"
        disabled={busy}
        inputRef={companyRef}
      />
      <TextField
        id={`${baseId}-portfolio`}
        label={copy.portfolioLabel}
        value={portfolioUrl}
        onChange={setPortfolioUrl}
        // Not `type="url"`: a designer typing `behance.net/name` without a
        // scheme is giving a perfectly usable answer, and the server accepts
        // it as free text for exactly that reason. `type="url"` would mark it
        // invalid in the browser's own view of the field.
        hint={copy.portfolioHint}
        disabled={busy}
        inputRef={portfolioRef}
      />
      <p className="type-caption text-text-muted">
        {dictionary.leadQualification.note}
      </p>
      <SelectField
        id={`${baseId}-project-type`}
        label={dictionary.leadQualification.projectTypeLabel}
        value={projectType}
        onChange={setProjectType}
        options={projectTypeOptions(dictionary)}
        placeholder={dictionary.leadQualification.unset}
        disabled={busy}
      />
      <SelectField
        id={`${baseId}-timeline`}
        label={dictionary.leadQualification.timelineLabel}
        value={timeline}
        onChange={setTimeline}
        options={timelineOptions(dictionary)}
        placeholder={dictionary.leadQualification.unset}
        disabled={busy}
      />

      <TextAreaField
        id={`${baseId}-message`}
        label={copy.messageLabel}
        value={message}
        onChange={setMessage}
        placeholder={copy.messagePlaceholder}
        disabled={busy}
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
        {status === "error" && !hasFieldError ? (
          <span className="text-error">{copy.errorMessage}</span>
        ) : null}
      </p>
    </form>
  );
}

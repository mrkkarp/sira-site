"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product, ProductVariant } from "@/lib/schemas/product";
import { trackSampleRequest } from "@/lib/analytics/events";
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
 * "Замовити зразок кольору".
 *
 * The cheapest possible commitment on the way to a made-to-order object that
 * costs 19 600 UAH and takes weeks to build — which is the entire reason it
 * exists. Somebody who will not put a sink in a cart today will give an
 * address for a sample, and that is a real, contactable lead rather than a
 * bounce.
 *
 * `address` is required because something physical gets posted; a sample
 * request with nowhere to send it is a message, not a request. Which colours
 * are wanted is free text — see `SampleRequestSchema` for why there is no
 * palette to pick from yet.
 *
 * `product`/`variant` are optional and passed only when this is rendered from
 * a product page. When they are present the conversion is worth that
 * product's real price instead of the generic lead value: a sample asked for
 * while looking at a specific sink is a materially warmer signal than one
 * asked for from the samples page, and flattening the two would hide it.
 */
export function SampleRequestForm({
  dictionary,
  location,
  product,
  variant,
}: {
  dictionary: Dictionary;
  /** Where the form is rendered, so GA4 can separate the two placements. */
  location: string;
  product?: Product;
  variant?: ProductVariant;
}) {
  const copy = dictionary.samplesPage;
  const baseId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const fieldRefs = useMemo(
    () => ({
      name: nameRef,
      phone: phoneRef,
      email: emailRef,
      address: addressRef,
      message: messageRef,
    }),
    [],
  );

  /** Mirrors `SampleFormInput` in `/api/sample/route.ts`, field for field. */
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
      if (isBlank(values.address)) errors.address = copy.requiredAddress;
      return errors;
    },
    [dictionary, copy],
  );

  const onAccepted = useCallback(
    async (eventId: string) => {
      const userData = await hashUserData({ email, phone });
      // `eventId` is the value the POST body just carried to `/api/sample`;
      // sharing it is what stops Meta counting this lead once from the pixel
      // and again from the Conversions API. See `lib/forms/event-id.ts`.
      trackSampleRequest({ location, product, variant, userData, eventId });
    },
    [email, phone, location, product, variant],
  );

  const { status, errors, honeypotRef, submit } = useLeadForm({
    endpoint: "/api/sample",
    validate,
    fieldRefs,
    onAccepted,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accepted = await submit(
      { name, phone, email, address, message },
      // Sent even though the write path currently drops it: the moment
      // products carry real Payload ids the relation starts being stored with
      // no change here. The product's name reaches staff via `message`
      // meanwhile.
      // `variantSku` is measurement only and is not stored — it is what lets
      // the server's copy of this conversion carry the same real price the
      // pixel is reporting. See the field's note in `/api/sample/route.ts`.
      product
        ? {
            productIds: [product.slug],
            ...(variant ? { variantSku: variant.sku } : {}),
          }
        : undefined,
    );
    if (!accepted) return;
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
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
      <TextField
        id={`${baseId}-address`}
        label={copy.addressLabel}
        value={address}
        onChange={setAddress}
        autoComplete="street-address"
        hint={copy.addressHint}
        required
        disabled={busy}
        error={errors.address}
        inputRef={addressRef}
      />
      <TextAreaField
        id={`${baseId}-message`}
        label={copy.finishesLabel}
        value={message}
        onChange={setMessage}
        placeholder={copy.finishesPlaceholder}
        hint={copy.finishesHint}
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

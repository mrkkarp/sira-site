"use client";

import { useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { z } from "zod";
import { PhoneNumber } from "@/domain/shared/phone";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { HoneypotField } from "@/components/forms/honeypot-field";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_WARRANTY_PHOTOS,
  validatePhotoFile,
} from "@/lib/forms/photo-upload";

type Status = "idle" | "submitting" | "success" | "error";
type FieldErrors = {
  name?: string;
  phone?: string;
  email?: string;
  issueDescription?: string;
};

interface PendingPhoto {
  key: string;
  file: File;
  status: "uploading" | "done" | "error";
  id?: string;
  error?: "too_large" | "invalid_type" | "upload_failed";
}

/** Loose client-side guard, mirrors `WarrantyFormInput` in `/api/warranty/route.ts`. */
const WarrantyFormFields = z.object({
  name: z.string().trim().min(1),
  phone: PhoneNumber,
  email: z.string().trim().email().optional().or(z.literal("")),
  issueDescription: z.string().trim().min(1),
});

let photoKeySeq = 0;

/**
 * Warranty-claim form (Phase I — file upload). Each selected photo is
 * uploaded immediately to `/api/warranty/upload` (one request per file,
 * so the customer sees per-photo progress/errors), and only the
 * resulting real `media` ids — never raw file data — travel with the
 * final `/api/warranty` submission. This mirrors `WarrantyRequestSchema`'s
 * `photoIds: MediaId[]` shape, which `lead-repository.payload.ts` already
 * maps end to end.
 */
export function WarrantyRequestForm({
  dictionary,
}: {
  dictionary: Dictionary;
}) {
  const w = dictionary.warranty;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const baseId = useId();
  const honeypotRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const issueRef = useRef<HTMLTextAreaElement>(null);

  const isUploading = photos.some((photo) => photo.status === "uploading");

  async function uploadPhoto(key: string, file: File) {
    try {
      const body = new FormData();
      body.set("photo", file);
      const response = await fetch("/api/warranty/upload", {
        method: "POST",
        body,
      });
      const json = (await response.json()) as
        { ok: true; id: string } | { ok: false; error: string };
      if (!json.ok) {
        setPhotos((current) =>
          current.map((photo) =>
            photo.key === key
              ? { ...photo, status: "error", error: "upload_failed" }
              : photo,
          ),
        );
        return;
      }
      setPhotos((current) =>
        current.map((photo) =>
          photo.key === key ? { ...photo, status: "done", id: json.id } : photo,
        ),
      );
    } catch {
      setPhotos((current) =>
        current.map((photo) =>
          photo.key === key
            ? { ...photo, status: "error", error: "upload_failed" }
            : photo,
        ),
      );
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remainingSlots = MAX_WARRANTY_PHOTOS - photos.length;
    const accepted = files.slice(0, Math.max(remainingSlots, 0));

    for (const file of accepted) {
      const key = `photo-${photoKeySeq++}`;
      const validation = validatePhotoFile({
        mimetype: file.type,
        size: file.size,
      });
      if (!validation.ok) {
        setPhotos((current) => [
          ...current,
          { key, file, status: "error", error: validation.error },
        ]);
        continue;
      }
      setPhotos((current) => [...current, { key, file, status: "uploading" }]);
      void uploadPhoto(key, file);
    }
  }

  function removePhoto(key: string) {
    setPhotos((current) => current.filter((photo) => photo.key !== key));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = WarrantyFormFields.safeParse({
      name,
      phone,
      email,
      issueDescription,
    });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "name" && !nextErrors.name) {
          // `name` is `min(1)` after a trim, so the only way it fails is
          // by being empty. The old ternary here also had an
          // `invalidPhone` arm, which was both unreachable and, had it
          // ever fired, about the wrong field entirely.
          nextErrors.name = dictionary.leadFields.requiredName;
        }
        if (issue.path[0] === "phone" && !nextErrors.phone) {
          nextErrors.phone = phone.trim()
            ? dictionary.leadFields.invalidPhone
            : dictionary.leadFields.requiredPhone;
        }
        if (issue.path[0] === "email" && !nextErrors.email) {
          // Was `invalidPhone`: mistyping your email told you to check
          // your phone number. Email is optional here, so a failure can
          // only mean a malformed address — there is no "required" arm.
          nextErrors.email = dictionary.leadFields.invalidEmail;
        }
        if (
          issue.path[0] === "issueDescription" &&
          !nextErrors.issueDescription
        ) {
          nextErrors.issueDescription = w.requiredIssue;
        }
      }
      setErrors(nextErrors);
      setStatus("error");
      // Prompt 9 §2 (accessibility audit) — the `aria-live` status line
      // below only speaks for the network-failure path, so a field
      // validation failure (the far more common case) produced no
      // announcement at all. Moving focus to the first invalid field makes
      // the screen reader announce that field's name + invalid state +
      // linked error text immediately (SC 3.3.1), without needing a
      // separate summary message.
      (nextErrors.name
        ? nameRef
        : nextErrors.phone
          ? phoneRef
          : nextErrors.email
            ? emailRef
            : issueRef
      ).current?.focus();
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const photoIds = photos
        .filter((photo) => photo.status === "done")
        .map((photo) => photo.id!);
      const response = await fetch("/api/warranty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email || undefined,
          orderNumber: orderNumber.trim() || undefined,
          issueDescription: parsed.data.issueDescription,
          photoIds: photoIds.length > 0 ? photoIds : undefined,
          [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
        }),
      });
      if (!response.ok) throw new Error("request_failed");
      setStatus("success");
      setName("");
      setPhone("");
      setEmail("");
      setOrderNumber("");
      setIssueDescription("");
      setPhotos([]);
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "border-border-strong bg-background text-text placeholder:text-text-muted type-body-sm h-11 w-full border px-(--space-sm) outline-none disabled:opacity-60";
  const textareaClass =
    "border-border-strong bg-background text-text placeholder:text-text-muted type-body-sm w-full border px-(--space-sm) py-(--space-2xs) outline-none disabled:opacity-60";

  const photoErrorMessage = (error: PendingPhoto["error"]) => {
    if (error === "too_large") return w.photoTooLarge;
    if (error === "invalid_type") return w.photoInvalidType;
    return w.errorMessage;
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-(--space-sm)"
    >
      <HoneypotField ref={honeypotRef} />

      <div>
        <VisuallyHidden as="label" htmlFor={`${baseId}-name`}>
          <span>{dictionary.leadFields.nameLabel}</span>
        </VisuallyHidden>
        <input
          ref={nameRef}
          id={`${baseId}-name`}
          type="text"
          // `required` on a `noValidate` form is purely a semantic
          // announcement — the browser bubble stays suppressed and
          // `handleSubmit` remains the only validator. Without it, name,
          // phone and the issue description were indistinguishable from the
          // genuinely optional email and order number: this form has no
          // visible "*" either, so requiredness reached nobody at all
          // (WCAG 3.3.2). Deliberately not on `email`/`order-number`.
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

      <div>
        <VisuallyHidden as="label" htmlFor={`${baseId}-email`}>
          <span>{w.emailLabel}</span>
        </VisuallyHidden>
        <input
          ref={emailRef}
          id={`${baseId}-email`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={w.emailPlaceholder}
          disabled={status === "submitting"}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${baseId}-email-error` : undefined}
          className={inputClass}
        />
        {errors.email ? (
          <p
            id={`${baseId}-email-error`}
            className="type-caption text-error mt-(--space-3xs)"
          >
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <VisuallyHidden as="label" htmlFor={`${baseId}-order-number`}>
          <span>{w.orderNumberLabel}</span>
        </VisuallyHidden>
        <input
          id={`${baseId}-order-number`}
          type="text"
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder={w.orderNumberPlaceholder}
          disabled={status === "submitting"}
          className={inputClass}
        />
      </div>

      <div>
        <VisuallyHidden as="label" htmlFor={`${baseId}-issue`}>
          <span>{w.issueLabel}</span>
        </VisuallyHidden>
        <textarea
          ref={issueRef}
          id={`${baseId}-issue`}
          rows={4}
          required
          value={issueDescription}
          onChange={(event) => setIssueDescription(event.target.value)}
          placeholder={w.issuePlaceholder}
          disabled={status === "submitting"}
          aria-invalid={Boolean(errors.issueDescription)}
          aria-describedby={
            errors.issueDescription ? `${baseId}-issue-error` : undefined
          }
          className={textareaClass}
        />
        {errors.issueDescription ? (
          <p
            id={`${baseId}-issue-error`}
            className="type-caption text-error mt-(--space-3xs)"
          >
            {errors.issueDescription}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-(--space-2xs)">
        <p className="type-technical-label text-text-muted">{w.photosLabel}</p>
        <p className="type-caption text-text-muted">{w.photosHint}</p>

        {photos.length > 0 ? (
          <ul className="flex flex-col gap-(--space-3xs)">
            {photos.map((photo) => (
              <li
                key={photo.key}
                className="type-body-sm border-border-strong flex items-center justify-between gap-(--space-sm) border px-(--space-sm) py-(--space-3xs)"
              >
                <span className="text-text truncate">{photo.file.name}</span>
                <span className="flex items-center gap-(--space-2xs)">
                  {photo.status === "uploading" ? (
                    <span className="text-text-muted">{w.uploadingPhoto}</span>
                  ) : null}
                  {photo.status === "error" ? (
                    <span className="text-error">
                      {photoErrorMessage(photo.error)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.key)}
                    className="text-text-muted hover:text-text underline"
                  >
                    {w.removePhotoCta}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {photos.length < MAX_WARRANTY_PHOTOS ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_PHOTO_MIME_TYPES.join(",")}
              multiple
              onChange={handleFilesSelected}
              disabled={status === "submitting"}
              className="hidden"
              id={`${baseId}-photo-input`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={status === "submitting"}
              onClick={() => fileInputRef.current?.click()}
            >
              {w.addPhotoCta}
            </Button>
          </div>
        ) : (
          <p className="type-caption text-text-muted">{w.tooManyPhotos}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="accent"
        disabled={status === "submitting" || isUploading}
        className="self-start"
      >
        {status === "submitting" ? w.submittingCta : w.submitCta}
      </Button>

      <p aria-live="polite" className="type-caption min-h-[1.4em]">
        {status === "success" ? (
          <span className="text-text-muted">{w.successMessage}</span>
        ) : null}
        {status === "error" &&
        !errors.name &&
        !errors.phone &&
        !errors.email &&
        !errors.issueDescription ? (
          <span className="text-error">{w.errorMessage}</span>
        ) : null}
      </p>
    </form>
  );
}

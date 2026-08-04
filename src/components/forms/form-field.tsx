"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Labelled field primitives for the lead forms.
 *
 * The wiring here — `htmlFor`/`id`, `aria-invalid`, `aria-describedby`
 * pointing at the error, `required` present but the browser bubble suppressed
 * by the form's `noValidate` — is the part that is easy to get almost right.
 * Almost right is invisible: the field looks fine, the error is on screen, and
 * a screen reader simply never mentions it. Written once, three forms cannot
 * each drift a different way.
 *
 * Labels are visible, unlike the older `QuoteRequestForm`/`WarrantyRequestForm`
 * pattern of a `VisuallyHidden` label plus a placeholder. Those forms are two
 * and five fields; these ask about a project, and a placeholder is gone the
 * moment you start typing — on a long form that means the answer to "what was
 * this box for?" is no longer anywhere on screen.
 */

const inputClass =
  "border-border-strong bg-background text-text placeholder:text-text-muted type-body-sm w-full border px-(--space-sm) outline-none focus-visible:border-text disabled:opacity-60";

function FieldFrame({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-(--space-3xs)">
      <label htmlFor={id} className="type-technical-label text-text-muted">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-text-muted">
            {" *"}
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="type-caption text-text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="type-caption text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * `aria-describedby` has to name the hint and the error together when both
 * exist. Returning `undefined` rather than an empty string matters: an empty
 * `aria-describedby` is a reference to an element with no id, which some
 * screen readers announce as a blank description.
 */
function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(
    Boolean,
  );
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  hint,
  error,
  required,
  disabled,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "tel" | "email";
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <FieldFrame
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <input
        ref={inputRef}
        id={id}
        type={type}
        // Semantics only — every one of these forms is `noValidate`, so the
        // browser prompt stays suppressed and the submit handler remains the
        // single validator. Without it, a required field and an optional one
        // are indistinguishable to anyone not seeing the asterisk.
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(inputClass, "h-11")}
      />
    </FieldFrame>
  );
}

/**
 * A `<select>`, for the two optional qualification questions.
 *
 * A native select rather than a styled listbox: it is two questions on a lead
 * form, not a design surface, and the native control already has keyboard
 * support, a scrollable list on a phone, and — the part that matters most here
 * — no JavaScript between the visitor and their answer. A custom widget would
 * be more code and more ways for the most valuable form on the site to fail.
 *
 * `placeholder` renders as an empty-valued first option and is how "no answer"
 * is expressed. It is a real, selectable choice, not a disabled prompt: both
 * questions are optional, and someone who picks an option and then thinks
 * better of it must be able to take it back.
 */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  disabled,
  selectRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  hint?: string;
  disabled?: boolean;
  selectRef?: React.Ref<HTMLSelectElement>;
}) {
  return (
    <FieldFrame id={id} label={label} hint={hint}>
      <select
        ref={selectRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-describedby={describedBy(id, hint)}
        // `h-11` matches the text inputs: same rhythm, and comfortably past the
        // 24px floor `tap-targets.spec.ts` enforces for WCAG 2.5.8.
        className={cn(inputClass, "h-11")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  disabled,
  rows = 4,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <FieldFrame
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <textarea
        ref={inputRef}
        id={id}
        required={required}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(inputClass, "py-(--space-2xs)")}
      />
    </FieldFrame>
  );
}

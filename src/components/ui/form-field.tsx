import type { ReactNode } from "react";

/** Connects a label + hint/error text to a single form control via generated ids. */
export function FormField({
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
  /** Render prop so the input can receive the right `aria-describedby`. */
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    "aria-required"?: boolean;
  }) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-(--space-2xs)">
      <label htmlFor={id} className="type-label text-text">
        {label}
        {/* Correctly hidden — an asterisk read aloud as "star" tells nobody
            anything. But it was the *only* signal: `required` styled the
            label and stopped there, so requiredness reached sighted users
            and no one else, on every form built out of `FormField`
            (checkout, quote request, order lookup). `aria-required` below is
            the half that was missing (WCAG 3.3.2). */}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
        // Not `Boolean(required)`: `aria-required="false"` is legal but
        // noisy, and these forms validate on submit rather than relying on
        // the browser, so the attribute is purely an announcement.
        "aria-required": required || undefined,
      })}
      {hint && !error ? (
        <p id={hintId} className="type-caption text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="type-caption text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

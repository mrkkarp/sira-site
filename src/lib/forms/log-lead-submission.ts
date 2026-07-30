import "server-only";

/**
 * Structured, PII-free log line for every public form submission attempt
 * (Prompt 8 §8 — "structured logging без персональних даних"). Never pass
 * `name`/`phone`/`email`/free-text fields here — only the shape of what
 * happened, enough to spot abuse patterns or integration breakage
 * without the log itself becoming a store of personal data.
 */
export function logFormSubmission(event: {
  form: string;
  outcome:
    | "created"
    | "rejected_invalid"
    | "rejected_honeypot"
    | "rejected_rate_limited"
    | "rejected_origin"
    | "error";
  locale?: string;
  sourcePath?: string;
}): void {
  console.info(
    "[form-submission]",
    JSON.stringify({ ...event, at: new Date().toISOString() }),
  );
}

/**
 * Honeypot field shared by every public lead/subscription form (Prompt 8
 * §8 — "honeypot"). Real visitors never see or fill this field (see
 * `src/components/forms/honeypot-field.tsx` for the hidden input itself)
 * — any submission where it's non-empty is treated as a bot and gets a
 * fake "success" response rather than an outright rejection, so scrapers
 * don't learn to adapt their script.
 */
export const HONEYPOT_FIELD = "companyWebsite";

export function isHoneypotTripped(body: Record<string, unknown>): boolean {
  const value = body[HONEYPOT_FIELD];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The two qualification questions asked on the quote and designer forms.
 *
 * Why only two, and why optional. The brief's goal is *a small number of
 * enquiries from people genuinely planning a project* — not the largest pile of
 * leads. A form that asks nothing hands the workshop a phone number and no way
 * to tell a specifier with a signed project from someone browsing; a form that
 * asks six things is abandoned by the specifier too. These two are the ones
 * that change what a salesperson does next: *what kind of object* decides which
 * product line and which lead time apply, and *when* decides whether this is a
 * call today or a follow-up in a quarter. Budget was considered and left out —
 * it is the question most likely to lose a real private buyer who has not
 * costed the job yet, and for a made-to-order product the price is a
 * conversation anyway.
 *
 * Both are optional, deliberately. A blank answer is a real answer ("I would
 * rather just talk to you"), and turning either into a required field would
 * trade the enquiry itself for a segment label.
 *
 * No zod here on purpose. This module is imported by client components, and
 * `client-bundle.test.ts` fails the build if zod becomes reachable from one —
 * three lead forms nearly shipped its ~277 kB runtime that way. The zod enums
 * built from these arrays live in `lead-common.ts`, on the server side of the
 * line, exactly as `phone-rule.ts` sits under `phone.ts`.
 */

/**
 * What is being furnished.
 *
 * Split the way the catalogue and the sales conversation actually split, not
 * the way a CRM would: `private` and `commercial` are the same products bought
 * on entirely different terms (one sink versus a specification for twelve),
 * and `outdoor` is a different product line — planters, benches, landscaping —
 * with its own lead times. `other` exists so the answer is never a lie; a
 * select with no honest option is one people either skip or answer at random,
 * and random answers are worse than blanks.
 */
export const PROJECT_TYPES = [
  "private",
  "commercial",
  "outdoor",
  "other",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/**
 * How soon.
 *
 * Three buckets, because the decision cycle here runs weeks to months and a
 * finer scale would be false precision. `exploring` is not a weak lead — for a
 * designer it usually means a project in early design, which is exactly when a
 * specification decision gets made — so it is worded to be safe to pick rather
 * than as the "not serious" option.
 */
export const PROJECT_TIMELINES = ["now", "quarter", "exploring"] as const;
export type ProjectTimeline = (typeof PROJECT_TIMELINES)[number];

/**
 * Narrow an untrusted string to a `ProjectType`, or `undefined`.
 *
 * Used on the *client*, where the value comes back out of a `<select>` as a
 * plain string. The server re-validates with the zod enums regardless — this is
 * about not sending a value the API will reject, not about trusting the browser.
 */
export function asProjectType(value: string): ProjectType | undefined {
  return (PROJECT_TYPES as readonly string[]).includes(value)
    ? (value as ProjectType)
    : undefined;
}

/** As `asProjectType`, for the timeline. */
export function asProjectTimeline(value: string): ProjectTimeline | undefined {
  return (PROJECT_TIMELINES as readonly string[]).includes(value)
    ? (value as ProjectTimeline)
    : undefined;
}

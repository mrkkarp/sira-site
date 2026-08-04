import type { Dictionary } from "@/i18n/get-dictionary";
import {
  asProjectTimeline,
  asProjectType,
  PROJECT_TIMELINES,
  PROJECT_TYPES,
} from "@/domain/leads/qualification";

/**
 * The qualification selects, as the forms need them: option values from the
 * domain, labels from the dictionary.
 *
 * Built by mapping over `PROJECT_TYPES`/`PROJECT_TIMELINES` rather than by
 * listing the options here, which is what keeps three things in step — the
 * values the API accepts, the options a visitor sees, and the labels in three
 * languages. Add a fourth timeline to the domain array and this stops
 * compiling until `uk.json` has a label for it, because `Dictionary` is typed
 * from that file. That is the whole point: a select whose options have drifted
 * from the schema fails as a 400 on the site's most valuable form.
 *
 * Re-exported here, next to `field-rules.ts`, so a client component never has
 * to reach into `@/domain` directly — the same arrangement that keeps zod out
 * of the browser bundle.
 */
export {
  type ProjectTimeline,
  type ProjectType,
} from "@/domain/leads/qualification";

/**
 * The two answers, in the shape the API and the analytics event both take.
 *
 * Unanswered questions are left *out* rather than sent as `""`. The server
 * schemas are `z.enum(...).optional()`, so an empty string is not "no answer",
 * it is an invalid one — it would 400 the whole submission over a question the
 * visitor was explicitly allowed to skip. Same reason the key is omitted from
 * the dataLayer event: an empty `project_type` parameter creates a segment in
 * GA4 that reads as a real answer.
 *
 * Values are narrowed rather than trusted. They arrive from a `<select>` as
 * plain strings, and this keeps a stale option in a cached bundle from posting
 * something the schema will reject.
 */
export function qualificationBody(projectType: string, timeline: string) {
  const type = asProjectType(projectType);
  const when = asProjectTimeline(timeline);
  return {
    ...(type ? { projectType: type } : {}),
    ...(when ? { timeline: when } : {}),
  };
}

export function projectTypeOptions(dictionary: Dictionary) {
  const copy = dictionary.leadQualification.projectType;
  return PROJECT_TYPES.map((value) => ({ value, label: copy[value] }));
}

export function timelineOptions(dictionary: Dictionary) {
  const copy = dictionary.leadQualification.timeline;
  return PROJECT_TIMELINES.map((value) => ({ value, label: copy[value] }));
}

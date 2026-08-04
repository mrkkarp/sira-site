import { describe, expect, it } from "vitest";
import ukDictionary from "@/i18n/dictionaries/uk.json";
import enDictionary from "@/i18n/dictionaries/en.json";
import plDictionary from "@/i18n/dictionaries/pl.json";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  PROJECT_TIMELINES,
  PROJECT_TYPES,
} from "@/domain/leads/qualification";
import { ProjectTimeline, ProjectType } from "@/domain/leads/lead-common";
import {
  projectTypeOptions,
  qualificationBody,
  timelineOptions,
} from "./qualification-fields";

/**
 * The two qualification questions have three separate definitions of "what the
 * valid answers are": the arrays the `<select>` is built from, the zod enums
 * the API validates against, and the label maps in three dictionaries. They are
 * all derived from the same source *today*, and this file is here to make sure
 * they stay that way — this is exactly the shape of the bug the phone rule
 * already had once, where a client guard and a server schema disagreed about
 * the same field and the disagreement only showed up as customer-facing 400s.
 */

const dictionaries: [string, Dictionary][] = [
  ["uk", ukDictionary as Dictionary],
  ["en", enDictionary as Dictionary],
  ["pl", plDictionary as Dictionary],
];

describe("the options offered and the values accepted", () => {
  it.each(dictionaries)(
    "%s offers exactly the project types the API accepts",
    (_locale, dictionary) => {
      const values = projectTypeOptions(dictionary).map((o) => o.value);
      expect(values).toEqual([...PROJECT_TYPES]);
      for (const value of values) {
        expect(ProjectType.safeParse(value).success).toBe(true);
      }
    },
  );

  it.each(dictionaries)(
    "%s offers exactly the timelines the API accepts",
    (_locale, dictionary) => {
      const values = timelineOptions(dictionary).map((o) => o.value);
      expect(values).toEqual([...PROJECT_TIMELINES]);
      for (const value of values) {
        expect(ProjectTimeline.safeParse(value).success).toBe(true);
      }
    },
  );

  it.each(dictionaries)(
    "%s labels every option with real text, not a key",
    (_locale, dictionary) => {
      // A missing translation surfaces as `undefined` here rather than as a
      // blank line in a dropdown on a live page.
      for (const option of [
        ...projectTypeOptions(dictionary),
        ...timelineOptions(dictionary),
      ]) {
        expect(option.label).toBeTruthy();
        expect(option.label).not.toBe(option.value);
      }
    },
  );

  it("gives the three locales different words for the same options", () => {
    // Guards against a "translation" that was copied across untouched — the
    // dictionaries are structurally identical by design, which makes an
    // untranslated block invisible to every other check.
    const labels = dictionaries.map(([, dictionary]) =>
      projectTypeOptions(dictionary)
        .map((o) => o.label)
        .join("|"),
    );
    expect(new Set(labels).size).toBe(3);
  });
});

describe("qualificationBody", () => {
  it("omits a question that was not answered", () => {
    // Not `{ projectType: "" }`: the server schemas are `.optional()` enums, so
    // an empty string is an *invalid* answer rather than an absent one, and
    // sending it would 400 the whole submission over a skipped question.
    expect(qualificationBody("", "")).toEqual({});
    expect(qualificationBody("commercial", "")).toEqual({
      projectType: "commercial",
    });
    expect(qualificationBody("", "now")).toEqual({ timeline: "now" });
  });

  it("passes both through when both were answered", () => {
    expect(qualificationBody("outdoor", "quarter")).toEqual({
      projectType: "outdoor",
      timeline: "quarter",
    });
  });

  it("drops a value that is not one of the options", () => {
    // The values come out of a `<select>` as plain strings. A stale bundle
    // offering a retired option should lose the answer, not lose the lead.
    expect(qualificationBody("penthouse", "someday")).toEqual({});
  });
});

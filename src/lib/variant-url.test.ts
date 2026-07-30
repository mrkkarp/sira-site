import { describe, expect, it } from "vitest";
import {
  parseVariantSelectionFromSearchParams,
  serializeVariantSelection,
  buildVariantHref,
} from "@/lib/variant-url";

describe("parseVariantSelectionFromSearchParams", () => {
  it("reads only the known option ids", () => {
    expect(
      parseVariantSelectionFromSearchParams({ colour: "custom", junk: "x" }, [
        "colour",
      ]),
    ).toEqual({ colour: "custom" });
  });

  it("takes the first value when Next hands back an array", () => {
    expect(
      parseVariantSelectionFromSearchParams({ colour: ["custom", "base"] }, [
        "colour",
      ]),
    ).toEqual({ colour: "custom" });
  });

  it("ignores absent/empty values", () => {
    expect(parseVariantSelectionFromSearchParams({}, ["colour"])).toEqual({});
    expect(
      parseVariantSelectionFromSearchParams({ colour: "" }, ["colour"]),
    ).toEqual({});
  });
});

describe("serializeVariantSelection", () => {
  it("builds a stable query string", () => {
    expect(serializeVariantSelection({ colour: "custom" })).toBe(
      "colour=custom",
    );
    expect(serializeVariantSelection({})).toBe("");
  });
});

describe("buildVariantHref", () => {
  it("appends the query only when non-empty", () => {
    expect(buildVariantHref("/uk/products/odri", { colour: "custom" })).toBe(
      "/uk/products/odri?colour=custom",
    );
    expect(buildVariantHref("/uk/products/odri", {})).toBe("/uk/products/odri");
  });
});

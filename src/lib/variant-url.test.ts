import { describe, expect, it } from "vitest";
import {
  parseVariantSelectionFromQueryString,
  serializeVariantSelection,
  buildVariantHref,
} from "@/lib/variant-url";

describe("parseVariantSelectionFromQueryString", () => {
  it("reads only the known option ids", () => {
    expect(
      parseVariantSelectionFromQueryString("?colour=custom&junk=x", ["colour"]),
    ).toEqual({ colour: "custom" });
  });

  it("takes the first value when a key is repeated", () => {
    expect(
      parseVariantSelectionFromQueryString("?colour=custom&colour=base", [
        "colour",
      ]),
    ).toEqual({ colour: "custom" });
  });

  it("ignores absent/empty values", () => {
    expect(parseVariantSelectionFromQueryString("", ["colour"])).toEqual({});
    expect(parseVariantSelectionFromQueryString("?", ["colour"])).toEqual({});
    expect(parseVariantSelectionFromQueryString("?colour=", ["colour"])).toEqual(
      {},
    );
  });

  it("round-trips whatever `buildVariantHref` wrote", () => {
    const selection = { colour: "custom" };
    const href = buildVariantHref("/products/odri", selection);
    expect(
      parseVariantSelectionFromQueryString(new URL(href, "https://x").search, [
        "colour",
      ]),
    ).toEqual(selection);
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

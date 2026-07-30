import { describe, expect, it } from "vitest";
import { localeAndSourcePathFromReferer } from "./request-context";

describe("localeAndSourcePathFromReferer", () => {
  it("defaults to uk with no sourcePath when there's no referer", () => {
    expect(localeAndSourcePathFromReferer(null)).toEqual({ locale: "uk" });
  });

  it("treats an unprefixed path as the default locale (uk)", () => {
    expect(
      localeAndSourcePathFromReferer("https://odudlab.example/products/odri"),
    ).toEqual({
      locale: "uk",
      sourcePath: "/products/odri",
    });
  });

  it("extracts a non-default locale prefix and strips it from sourcePath", () => {
    expect(
      localeAndSourcePathFromReferer(
        "https://odudlab.example/en/products/odri",
      ),
    ).toEqual({
      locale: "en",
      sourcePath: "/products/odri",
    });
  });

  it("strips query params from sourcePath", () => {
    expect(
      localeAndSourcePathFromReferer(
        "https://odudlab.example/en/shop?utm_source=ads",
      ),
    ).toEqual({ locale: "en", sourcePath: "/shop" });
  });

  it("falls back to the default locale for a malformed referer", () => {
    expect(localeAndSourcePathFromReferer("not-a-url")).toEqual({
      locale: "uk",
    });
  });

  it("uses '/' as sourcePath for the bare homepage", () => {
    expect(localeAndSourcePathFromReferer("https://odudlab.example/")).toEqual({
      locale: "uk",
      sourcePath: "/",
    });
  });

  it("uses '/' as sourcePath for a locale-only homepage path", () => {
    expect(
      localeAndSourcePathFromReferer("https://odudlab.example/pl"),
    ).toEqual({
      locale: "pl",
      sourcePath: "/",
    });
  });
});

import { describe, expect, it } from "vitest";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";
import { locales } from "@/i18n/config";

describe("localeHref", () => {
  it("leaves the default locale unprefixed", () => {
    expect(localeHref("uk", "/shop")).toBe("/shop");
    expect(localeHref("uk", "/")).toBe("/");
  });

  it("prefixes non-default locales", () => {
    expect(localeHref("en", "/shop")).toBe("/en/shop");
    expect(localeHref("pl", "/")).toBe("/pl");
  });
});

describe("stripLocaleFromPathname", () => {
  it("strips a known locale prefix", () => {
    expect(stripLocaleFromPathname("/en/rakovyny/nakladni", locales)).toBe(
      "/rakovyny/nakladni",
    );
    expect(stripLocaleFromPathname("/pl", locales)).toBe("/");
  });

  it("returns the path unchanged when there is no locale prefix", () => {
    expect(stripLocaleFromPathname("/rakovyny", locales)).toBe("/rakovyny");
  });
});

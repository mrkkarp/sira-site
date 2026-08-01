import { describe, expect, it } from "vitest";
import { getInstallationSpecEntries } from "@/lib/product-installation";

describe("getInstallationSpecEntries", () => {
  it("picks out real Монтаж/Підключення entries", () => {
    const entries = getInstallationSpecEntries([
      { key: "material", label: "Матеріал", value: "архітектурний бетон" },
      { key: "mountType", label: "Монтаж", value: "накладний на стільницю" },
      {
        key: "connection",
        label: "Підключення",
        value: "можливе зі стіни або з підлоги",
      },
    ]);
    expect(entries).toEqual([
      { key: "mountType", label: "Монтаж", value: "накладний на стільницю" },
      {
        key: "connection",
        label: "Підключення",
        value: "можливе зі стіни або з підлоги",
      },
    ]);
  });

  it("matches on `key`, not on the localized label", () => {
    // The regression this guards: labels are translated per locale, so
    // filtering by label would return nothing on /en and /pl and silently
    // hide the entire "Монтаж" accordion section in those languages.
    expect(
      getInstallationSpecEntries([
        { key: "mountType", label: "Mounting", value: "countertop" },
        { key: "connection", label: "Podłączenie", value: "ścienne" },
      ]),
    ).toHaveLength(2);
  });

  it("returns an empty array when a product has no installation-related spec entries", () => {
    expect(
      getInstallationSpecEntries([
        { key: "material", label: "Матеріал", value: "бетон" },
      ]),
    ).toEqual([]);
  });

  it("ignores a keyless legacy entry even if its label looks installation-related", () => {
    // A legacy-parsed entry whose source label has no typed counterpart has
    // no key; it still renders in the main specs table, it just is not
    // filterable into the installation section.
    expect(
      getInstallationSpecEntries([
        { label: "Оздоблення", value: "шліфування" },
      ]),
    ).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { getInstallationSpecEntries } from "@/lib/product-installation";

describe("getInstallationSpecEntries", () => {
  it("picks out real Монтаж/Підключення entries", () => {
    const entries = getInstallationSpecEntries([
      { label: "Матеріал", value: "архітектурний бетон" },
      { label: "Монтаж", value: "накладний на стільницю" },
      { label: "Підключення", value: "можливе зі стіни або з підлоги" },
    ]);
    expect(entries).toEqual([
      { label: "Монтаж", value: "накладний на стільницю" },
      { label: "Підключення", value: "можливе зі стіни або з підлоги" },
    ]);
  });

  it("returns an empty array when a product has no installation-related spec entries", () => {
    expect(
      getInstallationSpecEntries([{ label: "Матеріал", value: "бетон" }]),
    ).toEqual([]);
  });
});

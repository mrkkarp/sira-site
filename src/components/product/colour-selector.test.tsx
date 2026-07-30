import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ColourSelector } from "@/components/product/colour-selector";
import type { VariantChoice } from "@/lib/variant-model";

const choices: VariantChoice[] = [
  { id: "base", label: "Сірий базовий", available: true, photo: "/a.jpg" },
  { id: "custom", label: "Свій колір", available: true, photo: "/b.jpg" },
];

describe("ColourSelector", () => {
  it("marks the selected real colour choice and calls onSelect on click", async () => {
    const dictionary = await getDictionary("uk");
    const onSelect = vi.fn();
    render(
      <ColourSelector
        choices={choices}
        selectedId="base"
        onSelect={onSelect}
        dictionary={dictionary}
        brokenImageLabel="broken"
      />,
    );
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");

    fireEvent.click(options[1]);
    expect(onSelect).toHaveBeenCalledWith("custom");
  });

  it("supports keyboard navigation between real colour choices", async () => {
    const dictionary = await getDictionary("uk");
    const onSelect = vi.fn();
    render(
      <ColourSelector
        choices={choices}
        selectedId="base"
        onSelect={onSelect}
        dictionary={dictionary}
        brokenImageLabel="broken"
      />,
    );
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledWith("custom");
  });
});

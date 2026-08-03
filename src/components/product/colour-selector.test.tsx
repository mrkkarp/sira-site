import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ColourSelector } from "@/components/product/colour-selector";
import type { VariantChoice } from "@/lib/variant-model";

const choices: VariantChoice[] = [
  {
    id: "base",
    label: "Сірий базовий",
    available: true,
    photo: "/a.jpg",
    kind: "standard",
    price: 15150,
    surcharge: 0,
    contactRequired: false,
  },
  {
    id: "custom",
    label: "Свій колір",
    available: true,
    photo: "/b.jpg",
    kind: "custom",
    price: 17150,
    surcharge: 2000,
    contactRequired: true,
  },
];

async function renderSelector(
  overrides: Partial<Parameters<typeof ColourSelector>[0]> = {},
) {
  const dictionary = await getDictionary("uk");
  const onSelect = vi.fn();
  render(
    <ColourSelector
      choices={choices}
      selectedId="base"
      onSelect={onSelect}
      dictionary={dictionary}
      locale="uk"
      brokenImageLabel="broken"
      {...overrides}
    />,
  );
  return { dictionary, onSelect };
}

describe("ColourSelector", () => {
  it("exposes a radiogroup, marks the checked colour, and calls onSelect on click", async () => {
    const { onSelect } = await renderSelector();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(radios[1]).toHaveAttribute("aria-checked", "false");

    fireEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith("custom");
  });

  it("supports arrow-key navigation between real colour choices", async () => {
    const { onSelect } = await renderSelector();
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledWith("custom");
  });

  it("labels the two sections and shows the RAL/NCS custom note", async () => {
    const { dictionary } = await renderSelector();
    expect(
      screen.getByText(dictionary.product.colourStandardLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.product.colourCustomLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.product.colourCustomNote),
    ).toBeInTheDocument();
  });
});

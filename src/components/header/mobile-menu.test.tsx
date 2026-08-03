import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { MobileMenu } from "@/components/header/mobile-menu";
import { catalogTree } from "@/config/navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

/**
 * Each catalogue row in the mobile menu is two controls side by side: a link
 * that navigates to the category, and a button that expands its subcategories
 * in place. They used to share one accessible name — the category label — so
 * the row announced as "Умивальники, посилання" then "Умивальники, кнопка",
 * two different behaviours behind the same words. The only thing separating
 * them was the visual plus icon, which is `aria-hidden` by design.
 *
 * `aria-expanded` already conveys open/closed; what was missing was what the
 * button is *for*.
 */
describe("MobileMenu", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  async function renderMenu() {
    const dictionary = await getDictionary("uk");
    render(
      <MobileMenu open onClose={vi.fn()} locale="uk" dictionary={dictionary} />,
    );
    return dictionary;
  }

  /** The first catalogue entry that actually has an expander. */
  const parentNode = catalogTree.find((node) => node.children);

  it("distinguishes the subcategory expander from the category link", async () => {
    const dictionary = await renderMenu();
    if (!parentNode) throw new Error("catalogTree has no expandable node");

    const label =
      dictionary.catalogNav[
        parentNode.labelKey as keyof typeof dictionary.catalogNav
      ];

    // The link keeps the bare category name...
    expect(screen.getByRole("link", { name: label })).toHaveAttribute(
      "href",
      parentNode.href,
    );

    // ...and the button no longer collides with it. `getByRole` throws on a
    // duplicate match, so the regression fails here rather than passing.
    const expander = screen.getByRole("button", {
      name: `Підкатегорії: ${label}`,
    });
    expect(expander).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles aria-expanded on the row it controls", async () => {
    const dictionary = await renderMenu();
    if (!parentNode) throw new Error("catalogTree has no expandable node");

    const label =
      dictionary.catalogNav[
        parentNode.labelKey as keyof typeof dictionary.catalogNav
      ];
    const expander = screen.getByRole("button", {
      name: `Підкатегорії: ${label}`,
    });

    fireEvent.click(expander);
    expect(expander).toHaveAttribute("aria-expanded", "true");
    // The panel it names must exist, or `aria-controls` points at nothing.
    expect(
      document.getElementById(expander.getAttribute("aria-controls") ?? ""),
    ).not.toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MegaMenu } from "@/components/header/mega-menu";

/**
 * The reported bug: opening the desktop mega-menu, clicking a link, and
 * landing on the new page with the menu still open. These cover the panel's
 * own close paths — internal-link click, Escape (+ focus restore), and
 * outside-click — plus the `aria-expanded`/`aria-controls` wiring. The
 * route-change catch-all lives in `Header` and is covered in `header.test.tsx`.
 */
describe("MegaMenu", () => {
  function renderMenu(open: boolean, onOpenChange = vi.fn()) {
    render(
      <MegaMenu
        menuKey="catalog"
        openKey={open ? "catalog" : null}
        onOpenChange={onOpenChange}
        label="Каталог"
      >
        {/* Raw <a>, not next/link, is the point: the panel must close on ANY
            in-panel anchor click regardless of how the link was authored. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/rakovyny">Раковини</a>
      </MegaMenu>,
    );
    return { onOpenChange };
  }

  it("reflects open state via aria-expanded and points aria-controls at the panel", () => {
    renderMenu(false);
    const trigger = screen.getByRole("button", { name: "Каталог" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    render(
      <MegaMenu
        menuKey="catalog"
        openKey="catalog"
        onOpenChange={vi.fn()}
        label="Каталог2"
      >
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/rakovyny">Раковини</a>
      </MegaMenu>,
    );
    const openTrigger = screen.getByRole("button", { name: "Каталог2" });
    expect(openTrigger).toHaveAttribute("aria-expanded", "true");
    const panelId = openTrigger.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toBeInTheDocument();
  });

  it("closes when an internal link inside the panel is clicked", () => {
    const { onOpenChange } = renderMenu(true);
    fireEvent.click(screen.getByRole("link", { name: "Раковини" }));
    expect(onOpenChange).toHaveBeenCalledWith(null);
  });

  it("closes on Escape and restores focus to the trigger", () => {
    const { onOpenChange } = renderMenu(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(null);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Каталог" }),
    );
  });

  it("closes on an outside pointer press", () => {
    const { onOpenChange } = renderMenu(true);
    fireEvent.pointerDown(document.body);
    expect(onOpenChange).toHaveBeenCalledWith(null);
  });

  it("does not render a panel or backdrop while closed", () => {
    renderMenu(false);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Раковини" }),
    ).not.toBeInTheDocument();
  });
});

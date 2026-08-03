import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { SearchDrawer } from "@/components/header/search-drawer";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push, prefetch: vi.fn(), replace: vi.fn() }),
}));

/**
 * The search drawer declares `role="dialog"` + `aria-modal="true"`, which is a
 * promise to assistive technology that the rest of the page is inert while it
 * is open. It used to make that promise while implementing none of it: no
 * focus trap, no scroll lock, and state that outlived a close. These cover the
 * three.
 */
describe("SearchDrawer", () => {
  afterEach(() => {
    document.body.style.overflow = "";
    vi.clearAllMocks();
  });

  async function renderDrawer(open = true) {
    const dictionary = await getDictionary("uk");
    const onClose = vi.fn();
    const utils = render(
      <SearchDrawer
        open={open}
        onClose={onClose}
        locale="uk"
        dictionary={dictionary}
      />,
    );
    return { dictionary, onClose, ...utils };
  }

  it("locks page scroll while open and releases it on close", async () => {
    const { dictionary, onClose, rerender } = await renderDrawer();

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("hidden");
    });

    rerender(
      <SearchDrawer
        open={false}
        onClose={onClose}
        locale="uk"
        dictionary={dictionary}
      />,
    );

    expect(document.body.style.overflow).toBe("");
  });

  it("moves focus into the search input on open", async () => {
    await renderDrawer();

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("searchbox") as HTMLElement,
      );
    });
  });

  it("keeps Tab inside the drawer instead of walking into the page behind", async () => {
    const { container } = await renderDrawer();

    const panel = screen.getByRole("dialog");
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThan(1);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Forward from the last element wraps to the first, rather than moving to
    // whatever is behind the overlay.
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    // And backwards from the first wraps to the last.
    first.focus();
    fireEvent.keyDown(document, { key: "Shift" });
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    expect(container).toBeTruthy();
  });

  it("closes on Escape", async () => {
    const { onClose } = await renderDrawer();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("reopens blank rather than showing the previous search", async () => {
    const { dictionary, onClose, rerender } = await renderDrawer();

    const input = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "мийка" } });
    expect(input.value).toBe("мийка");

    // Close…
    rerender(
      <SearchDrawer
        open={false}
        onClose={onClose}
        locale="uk"
        dictionary={dictionary}
      />,
    );
    // …and reopen. The component never unmounts, so the query used to survive.
    rerender(
      <SearchDrawer
        open
        onClose={onClose}
        locale="uk"
        dictionary={dictionary}
      />,
    );

    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
  });
});

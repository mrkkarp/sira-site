import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DialogPrimitive } from "@/components/ui/dialog-primitive";

/**
 * `DialogPrimitive` backs `Modal` and `Drawer` — so the product-gallery
 * lightbox, the mobile shop filters and the cookie-consent dialog all inherit
 * whatever it does. It trapped focus but never locked page scroll, so the page
 * behind an open lightbox stayed scrollable, and `SmoothWheelScroll` (which
 * stands down only when it sees `body.style.overflow === "hidden"`) went on
 * animating it under the overlay.
 */
describe("DialogPrimitive", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  function renderDialog(open: boolean, onClose = vi.fn()) {
    return render(
      <DialogPrimitive open={open} onClose={onClose} labelledBy="t">
        <h2 id="t">Title</h2>
        <button type="button">first</button>
        <button type="button">second</button>
      </DialogPrimitive>,
    );
  }

  it("locks page scroll while open and restores it on close", () => {
    const onClose = vi.fn();
    const { rerender } = renderDialog(true, onClose);

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <DialogPrimitive open={false} onClose={onClose} labelledBy="t">
        <h2 id="t">Title</h2>
      </DialogPrimitive>,
    );

    expect(document.body.style.overflow).toBe("");
  });

  it("does not unlock scroll while another overlay is still open", () => {
    // Two overlays can legitimately overlap. Closing the inner one must not
    // hand scrolling back to the visitor while the outer one still covers the
    // page — the bug a plain set/clear pair would have.
    const outer = renderDialog(true);
    const inner = renderDialog(true);

    expect(document.body.style.overflow).toBe("hidden");

    inner.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    outer.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps Tab within the dialog", () => {
    renderDialog(true);
    const first = screen.getByRole("button", { name: "first" });
    const second = screen.getByRole("button", { name: "second" });

    second.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(second);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderDialog(true, onClose);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

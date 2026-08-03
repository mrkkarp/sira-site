import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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

  /**
   * The debounce only delays the *next* request — it never cancelled the one
   * already open, and nothing ordered the replies. A slow answer for a prefix
   * could therefore land after the answer for what the visitor actually typed
   * and overwrite it, leaving the drawer showing the wrong products with no
   * pending fetch to correct them.
   *
   * The fetch is resolved here in the opposite order to the typing, which is
   * the whole point: without the abort the last `setResults` wins, and the last
   * one to arrive is the stale one.
   */
  it("ignores a slow reply for a query the visitor has already typed past", async () => {
    vi.useFakeTimers();
    try {
      const resolvers: Array<(value: unknown) => void> = [];
      const requested: string[] = [];
      const fetchMock = vi.fn((url: string, init?: RequestInit) => {
        requested.push(new URL(url, "http://localhost").searchParams.get("q")!);
        return new Promise((resolve, reject) => {
          resolvers.push(resolve);
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      const dictionary = await getDictionary("uk");
      render(
        <SearchDrawer
          open
          onClose={vi.fn()}
          locale="uk"
          dictionary={dictionary}
        />,
      );

      const input = screen.getByRole("searchbox");
      // First query, debounce elapses, request is now in flight and unanswered.
      fireEvent.change(input, { target: { value: "ваз" } });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      // The visitor keeps typing before that reply arrives.
      fireEvent.change(input, { target: { value: "вазон" } });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(requested).toEqual(["ваз", "вазон"]);

      // The current query answers first…
      await act(async () => {
        resolvers[1]({
          ok: true,
          json: async () => ({
            products: [
              {
                slug: "vazon",
                name: "Вазон",
                category: "Вазони",
                price: 1,
                photo: "/vazon.jpg",
              },
            ],
            collections: [],
            projects: [],
            pages: [],
          }),
        });
      });
      // …and only then does the stale one, which must not be rendered.
      await act(async () => {
        resolvers[0]({
          ok: true,
          json: async () => ({
            products: [
              {
                slug: "vaza",
                name: "Ваза",
                category: "Вазони",
                price: 1,
                photo: "/vaza.jpg",
              },
            ],
            collections: [],
            projects: [],
            pages: [],
          }),
        });
      });

      expect(screen.getByText("Вазон")).toBeInTheDocument();
      expect(screen.queryByText("Ваза")).not.toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});

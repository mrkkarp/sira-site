import { test, expect } from "@playwright/test";

import { visit, waitForHydration } from "./support";

/**
 * WCAG 2.2 SC 2.5.8 (Target Size, Minimum): every pointer target at least
 * 24×24 CSS px. This is a real-browser check on purpose — the failures it
 * catches come from computed line-height and inherited type scales, not from
 * anything visible in the JSX, so jsdom cannot see them. The first run of this
 * audit found four: the hero's secondary CTA, the two `TextLink` CTAs on the
 * home page, and the breadcrumb crumbs, all 17–21px tall.
 *
 * 390×844 is the viewport that matters. It is a phone, where the pointer is a
 * thumb, and it is where the type scale is smallest.
 *
 * Deliberate exemptions, both taken from the success criterion itself:
 *  - a control wrapped in its own `<label>` is activated by the whole label,
 *    so the label is the target (this is what the filter checkboxes rely on:
 *    their 20px box sits inside a much larger clickable label);
 *  - a link inside a run of other text is exempt, because its size is set by
 *    the surrounding prose. Detected by comparing the link's text against its
 *    parent's — if they match, the link is standing alone and is not exempt.
 */

const PAGES = [
  "/",
  "/shop",
  // The `alias` from `products.source.json`, not the bare "odri" — see the
  // note at the top of `shop-and-product.spec.ts`. This is the page a visitor
  // actually reaches from the catalogue.
  "/products/rakovyna-na-pidlohu-odri",
  "/cart",
  "/contact",
  "/collections",
];

test.use({ viewport: { width: 390, height: 844 } });

for (const path of PAGES) {
  test(`every pointer target on ${path} is at least 24x24`, async ({
    page,
  }) => {
    // `visit` deliberately does not wait for images (see `support.ts`), which
    // is exactly right here: `next/image` reserves every box from its intrinsic
    // dimensions, so the geometry this audit measures is final long before any
    // photo arrives. Hydration is the real precondition — after React attaches,
    // every control is at its final size.
    await visit(page, path);
    await waitForHydration(page.locator("header").getByRole("link").first());

    const undersized = await page.evaluate(() => {
      const selector = [
        "button",
        "a[href]",
        "input:not([type=hidden])",
        "select",
        '[role="button"]',
        '[role="tab"]',
        "summary",
      ].join(", ");

      const found: string[] = [];
      for (const el of Array.from(document.querySelectorAll(selector))) {
        const target = el.closest("label") ?? el;
        const rect = target.getBoundingClientRect();

        // Not rendered at all — `display:none`, a collapsed accordion panel,
        // an overlay that has not been opened. Nothing to aim at yet.
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.width >= 24 && rect.height >= 24) continue;

        // The skip link is `sr-only` until focused; it is sized by
        // `focus:not-sr-only`, which this measurement cannot trigger.
        if ((el.getAttribute("class") ?? "").includes("sr-only")) continue;

        const display = getComputedStyle(el).display;
        if (
          el.tagName === "A" &&
          (display === "inline" || display === "inline-block")
        ) {
          const parentText = (el.parentElement?.textContent ?? "").trim();
          if (parentText !== (el.textContent ?? "").trim()) continue;
        }

        const name = (
          el.getAttribute("aria-label") ??
          el.textContent ??
          ""
        ).trim();
        found.push(
          `${Math.round(rect.width)}x${Math.round(rect.height)} <${el.tagName}> "${name.slice(0, 40)}"`,
        );
      }
      return found;
    });

    expect(undersized).toEqual([]);
  });
}

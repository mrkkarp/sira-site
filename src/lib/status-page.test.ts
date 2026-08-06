import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "@/lib/contrast";
import { renderNotFoundPage } from "@/lib/status-page";

/**
 * The proxy's 404/410 page is the one screen on the site that cannot use a
 * design token, because it is served without the stylesheet. Its colours are
 * therefore *copies* of values that live in `globals.css`, and copies drift.
 *
 * Nothing else would catch that drift. The two 404s are never on screen
 * together, so retuning the terracotta in CSS and leaving this page on the old
 * hex would look correct in every place anyone thinks to check. These tests
 * read the stylesheet and assert the copies still match the originals.
 */

const css = readFileSync(
  path.resolve(__dirname, "../app/globals.css"),
  "utf-8",
);

function token(name: string): string {
  const read = (key: string): string => {
    const match = css.match(new RegExp(`^\\s*${key}:\\s*([^;]+);`, "m"));
    if (!match) throw new Error(`${key} is not declared in globals.css`);
    return match[1].trim();
  };
  const raw = read(name);
  const alias = raw.match(/^var\((--[\w-]+)\)$/);
  return alias ? read(alias[1]) : raw;
}

const html = renderNotFoundPage("uk");

describe("the proxy's status page", () => {
  it("paints the eyebrow in --brand-accent-ink, not a stale copy of it", () => {
    expect(html).toContain(token("--brand-accent-ink"));
  });

  it("bands the crest tips in --brand-accent", () => {
    expect(html).toContain(token("--brand-accent"));
  });

  it("draws the crest shafts in the drawing layer's line colour", () => {
    expect(html).toContain(token("--drawing-line"));
  });

  it("sits on the same background the rest of the site uses", () => {
    expect(html).toContain(token("--color-background"));
  });

  it("keeps the eyebrow readable on that background", () => {
    // The eyebrow is text, so it is gated at 1.4.3's 4.5:1 — which is why this
    // page uses the ink and not `--brand-accent` (4.32:1, and it would fail).
    expect(
      contrast(token("--brand-accent-ink"), token("--color-background")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("draws exactly one crest, and hides it from screen readers", () => {
    // Same rule as `HoopoeCrest`: the mark is never the carrier of anything,
    // and the page already says "404" in real text directly beneath it.
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html).toContain('aria-hidden="true"');
  });

  it("stays a single self-contained document with no extra requests", () => {
    // The whole reason this page exists is that the proxy has to answer with a
    // status *and* a body. If it ever starts pulling in a stylesheet, a font
    // or an image, it stops being the thing that can do that cheaply.
    expect(html).not.toMatch(/<link\b|<script\b|<img\b/);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "@/lib/contrast";

/**
 * The brand accent's contrast, checked against the values `globals.css`
 * actually declares.
 *
 * This deliberately parses the stylesheet instead of restating the hexes. A
 * test with its own copy of the colours proves that six literals in a test
 * file are consistent with each other, which is not a fact anyone needs; the
 * fact worth guarding is that *the colours the site ships* clear the
 * thresholds for the jobs they do. Change a token in the CSS and this fails,
 * which is the only arrangement that would have caught the near-miss that
 * prompted it (`#a34c34` at 4.47:1 on `--color-surface-muted`, against a 4.5
 * requirement).
 *
 * Each token is gated at the threshold for its own role, which is the entire
 * reason one brand colour is split at all:
 *
 *  - `--brand-accent`         non-text: strokes, rules, marker rings → 3:1
 *                             (WCAG 1.4.11)
 *  - `--brand-accent-ink`     body-sized text and links on light     → 4.5:1
 *                             (WCAG 1.4.3)
 *  - `--brand-accent-on-dark` the same, on the footer band           → 4.5:1
 *  - `--brand-accent-tint`    not a foreground at all; instead `--color-text`
 *                             must still clear 4.5:1 *on* it
 *  - `--brand-accent-soft`    decorative only — asserted to be BELOW 3:1, so
 *                             that if someone ever "fixes" it into a usable
 *                             border colour the test tells them the rule it
 *                             was documented under no longer applies.
 *  - `--brand-accent-ink-hover`
 *                             the filled button's hover. Checked not just for
 *                             4.5:1 but for being *darker* than the resting
 *                             fill, since the failure mode here is a hover
 *                             that brightens.
 */

const css = readFileSync(
  path.resolve(__dirname, "../app/globals.css"),
  "utf-8",
);

/** Reads a custom property's literal value out of `:root`. Follows one level
 *  of `var()` indirection, which is exactly what `--brand-accent` uses to
 *  alias the pre-existing `--color-terracotta` material swatch. */
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

const LIGHT_SURFACES = [
  "--color-background",
  "--color-surface",
  "--color-surface-muted",
] as const;

describe("brand accent contrast", () => {
  it("aliases the material terracotta rather than inventing a second one", () => {
    expect(token("--brand-accent")).toBe(token("--color-terracotta"));
  });

  it.each(LIGHT_SURFACES)(
    "--brand-accent clears 3:1 for non-text use on %s",
    (surface) => {
      expect(
        contrast(token("--brand-accent"), token(surface)),
      ).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(LIGHT_SURFACES)(
    "--brand-accent-ink clears 4.5:1 for text on %s",
    (surface) => {
      expect(
        contrast(token("--brand-accent-ink"), token(surface)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("--brand-accent-on-dark clears 4.5:1 for text on the footer", () => {
    expect(
      contrast(token("--brand-accent-on-dark"), token("--color-footer")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("--color-text still clears 4.5:1 over the tint", () => {
    expect(
      contrast(token("--color-text"), token("--brand-accent-tint")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("--brand-accent-soft stays below 3:1, so it can never carry a state", () => {
    // Not a bug being locked in: this is why the token is documented as
    // decorative-only. If it ever rises above 3:1 the documentation around it
    // is stale and should be rewritten deliberately, not silently outgrown.
    expect(
      contrast(token("--brand-accent-soft"), token("--color-background")),
    ).toBeLessThan(3);
  });

  // ---- the accent used the other way round: as a ground, not a mark ----

  it("the filled CTA's label clears 4.5:1 on --brand-accent-fill", () => {
    expect(
      contrast(token("--color-surface"), token("--brand-accent-fill")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("the filled CTA's hover does not lose contrast", () => {
    // The direction is the point. A hover that *lightens* the fill walks a
    // light label toward the 4.32:1 that --brand-accent already fails at, so
    // the hover token must be darker than the resting one, not brighter.
    const rest = contrast(
      token("--color-surface"),
      token("--brand-accent-fill"),
    );
    const hover = contrast(
      token("--color-surface"),
      token("--brand-accent-fill-hover"),
    );
    expect(hover).toBeGreaterThanOrEqual(4.5);
    expect(hover).toBeGreaterThan(rest);
  });

  it("keeps the button's fill closer to the logo than the text ink is", () => {
    // The regression this guards is the one that produced the complaint. The
    // fill and the ink were a single token, which meant the button silently
    // inherited the *text* threshold — 4.5:1 as ink on a light page — and got
    // darkened until it read brown rather than terracotta.
    //
    // Those are two different jobs. A fill only has to clear 4.5:1 under its
    // own label, which is far cheaper, and the slack is exactly what buys the
    // brand colour back. So: the fill must sit between the logo's terracotta
    // and the ink, and must be nearer the logo. If anyone ever collapses the
    // two tokens again, this fails rather than quietly going brown.
    const toLogo = (t: string) => contrast(token(t), token("--brand-accent"));
    expect(toLogo("--brand-accent-fill")).toBeLessThan(
      toLogo("--brand-accent-ink"),
    );
    expect(token("--brand-accent-fill")).not.toBe(token("--brand-accent-ink"));
  });

  it("the tinted badge is readable: brand ink on brand wash", () => {
    expect(
      contrast(token("--brand-accent-ink"), token("--brand-accent-tint")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("--brand-accent is NOT safe as a filled button, which is why -ink is", () => {
    // The mistake this guards is the intuitive one: "use the brand colour for
    // the brand button". Light text on the raw accent measures 4.32:1. If this
    // ever passes, the accent has been darkened and the ink may be redundant.
    expect(
      contrast(token("--color-surface"), token("--brand-accent")),
    ).toBeLessThan(4.5);
  });

  it("--brand-accent is NOT safe for body text, which is why -ink exists", () => {
    // The pair only earns its complexity if the plain accent genuinely fails
    // the text threshold somewhere. If this ever passes, the two tokens have
    // converged and one of them should go.
    const worst = Math.min(
      ...LIGHT_SURFACES.map((surface) =>
        contrast(token("--brand-accent"), token(surface)),
      ),
    );
    expect(worst).toBeLessThan(4.5);
  });
});

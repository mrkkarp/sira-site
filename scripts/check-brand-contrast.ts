/**
 * WCAG contrast for the ODUDLAB brand accent, against every surface it is
 * allowed to touch.
 *
 * This exists because `globals.css` already carries three separate comments
 * recording a colour that had to be darkened after an audit caught it failing
 * (`--color-border-strong`, `--color-success`, `--color-error-on-dark`). The
 * terracotta is the first colour since to be promoted from "material swatch"
 * to "interface accent", which is exactly the move that turns a decorative
 * value into one people have to *read* — so it is checked before it ships.
 *
 * Each token is gated at the threshold for the job it actually does, which is
 * the whole point of splitting one brand colour into several:
 *   - `ink`      body-sized text and links      → 4.5:1 (AA 1.4.3)
 *   - `on-dark`  the same, on the footer        → 4.5:1
 *   - `accent`   strokes, markers, borders      → 3.0:1 (AA 1.4.11 non-text)
 *   - `tint`     a wash behind ordinary ink     → not a foreground; instead
 *                checked that `--color-text` still clears 4.5:1 *on* it.
 *
 * The accent is also a *background* now — the filled CTA and the tinted badge —
 * so the last three checks run in the other direction: the label is the
 * foreground and the brand colour is the ground. That direction is the one
 * that catches the obvious mistake, which is reaching for `--brand-accent` as
 * a button fill: light text on it measures 4.32:1 and fails, which is why the
 * `accent` button variant uses the ink and darkens on hover instead of
 * lightening.
 *
 * Run: npx tsx scripts/check-brand-contrast.ts
 */

import { contrast } from "../src/lib/contrast";

const TEXT = "#1d1d1b";

const lightSurfaces = {
  background: "#f1eee7",
  surface: "#faf9f5",
  "surface-muted": "#e7e2d9",
} as const;

const DARK = { footer: "#20201e" } as const;

type Check = {
  token: string;
  hex: string;
  role: string;
  against: Record<string, string>;
  min: number;
};

const checks: Check[] = [
  {
    token: "--brand-accent",
    hex: "#b85b42",
    role: "strokes / markers / borders (non-text)",
    against: lightSurfaces,
    min: 3,
  },
  {
    token: "--brand-accent-ink",
    hex: "#9d4832",
    role: "links and small labels on light",
    against: lightSurfaces,
    min: 4.5,
  },
  {
    token: "--brand-accent-on-dark",
    hex: "#d98368",
    role: "the same, on the footer",
    against: DARK,
    min: 4.5,
  },
  {
    token: "--color-text ON --brand-accent-tint",
    hex: TEXT,
    role: "ordinary ink over the tinted wash",
    against: { "accent-tint": "#eadcd3" },
    min: 4.5,
  },
  // ---- the accent as a background ----
  {
    token: "--color-surface ON --brand-accent-fill",
    hex: "#faf9f5",
    role: "the filled CTA's own label",
    against: { "accent-fill": "#b45739" },
    min: 4.5,
  },
  {
    token: "--color-surface ON --brand-accent-fill-hover",
    hex: "#faf9f5",
    role: "the same label once the pointer is on it",
    against: { "accent-fill-hover": "#9d4832" },
    min: 4.5,
  },
  {
    token: "--brand-accent-ink ON --brand-accent-tint",
    hex: "#9d4832",
    role: "the tinted badge — brand ink on brand wash",
    against: { "accent-tint": "#eadcd3" },
    min: 4.5,
  },
];

let failures = 0;

for (const check of checks) {
  console.log(`\n${check.token}  ${check.hex}`);
  console.log(`  role: ${check.role}  (min ${check.min}:1)`);
  for (const [name, surfaceHex] of Object.entries(check.against)) {
    const ratio = contrast(check.hex, surfaceHex);
    const pass = ratio >= check.min;
    if (!pass) failures += 1;
    console.log(
      `    on ${name.padEnd(14)} ${ratio.toFixed(2).padStart(5)}:1  ${pass ? "PASS" : "FAIL"}`,
    );
  }
}

// The soft border tone is deliberately NOT in the list above: it measures
// ~1.5:1 on the page background, far under 1.4.11's 3:1. It is allowed to
// exist only as decoration *alongside* a stronger signal, never as the sole
// indicator of a control's state or boundary. Recorded here so the next person
// to reach for it sees why.
console.log(
  `\nnote: --brand-accent-soft #ddbbad measures ${contrast("#ddbbad", "#f1eee7").toFixed(2)}:1 on background —` +
    `\n      decorative only; never the sole boundary or state indicator.`,
);

console.log(
  failures === 0
    ? "\nOK — every token clears the threshold for its own role."
    : `\n${failures} pairing(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);

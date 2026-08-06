/**
 * WCAG 2.x relative luminance and contrast ratio.
 *
 * Extracted from `scripts/check-brand-contrast.ts` so the same arithmetic can
 * back both the script and a real test. That mattered here: the script caught
 * a genuine failure the first time it ran — a proposed `--brand-accent-ink` of
 * `#a34c34` measured 4.47:1 on `--color-surface-muted`, three hundredths under
 * AA — and a check that only ever runs when someone remembers to run it will
 * not catch the next one.
 */

type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Not a 6-digit hex colour: ${hex}`);
  }
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ] as const;
}

/** The sRGB channels linearised, then weighted. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as unknown as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

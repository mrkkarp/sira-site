import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Shared with `LinkButton` — keep the two visually identical. */
export const buttonVariantClass = {
  "primary-dark": "bg-text text-background hover:bg-graphite",
  "primary-light":
    "bg-background text-text hover:bg-surface-muted border border-border",
  /**
   * The brand's filled button. Reserved for the *one* highest-intent action on
   * a page — submit the enquiry, order the samples, place the order — and never
   * for two different actions on the same screen. That restriction is what
   * keeps it an accent instead of a theme: §3 of the brief allows "CTA accents"
   * and forbids "всі кнопки", and a terracotta button is only an accent while
   * the button beside it is not one. "Continue shopping", "back to catalogue",
   * "retry" and every cookie-banner control stay as they are.
   *
   * A sticky bar that repeats the page's own primary action is the same action,
   * not a second one, so it takes the same variant — it is the same surface's
   * button pinned to the viewport, and having it change colour on scroll would
   * be strange.
   *
   * A *shortcut* to that action from another section is not the same case, even
   * with the same label and the same href. The home page has two "Замовити
   * зразки" links: the samples block, which is where the page actually makes
   * the ask, and one in the colour section, which is a way out of a section
   * about something else. Only the first is filled. The test is not "does this
   * go to the same URL" but "is this section's job to ask for this" — if it is
   * not, the button is a convenience and stays neutral, and the page keeps one
   * accent instead of two a scroll apart.
   *
   * The fill is `--brand-accent-ink`, not `--brand-accent`, and hover goes
   * *darker* rather than lighter. Both are forced by the label: light text
   * measures 5.85:1 on the ink and only 4.32:1 on the raw accent, so the
   * obvious "brand colour, lighten on hover" button would have shipped a
   * hover state that fails AA. Down to 7.23:1 instead.
   */
  accent: "bg-brand-accent-ink text-surface hover:bg-brand-accent-ink-hover",
  outline:
    "border border-text text-text hover:bg-text hover:text-background bg-transparent",
  ghost: "text-text-muted hover:text-text bg-transparent",
  /** Same shape as `primary-light`, tuned for use on the dark footer/hero
   * sections (light fill stays legible on `--color-footer`). */
  "outline-light":
    "border border-background text-background hover:bg-background hover:text-footer bg-transparent",
  /** `ghost` for dark surfaces. It exists because `cn()` deliberately does no
   * conflict resolution: passing `className="text-background"` alongside
   * `variant="ghost"` puts two equal-specificity `color` declarations on one
   * element, and Tailwind's generated stylesheet order — not the call site —
   * picks the winner. `text-text-muted` sorts later and won, so the cookie
   * banner's buttons rendered near-black on `--color-footer` (1.03:1 for the
   * "reject optional" button — invisible). Dark-surface treatments belong in a
   * variant, never in a caller override. */
  "ghost-light": "text-background hover:text-background/70 bg-transparent",
} as const;

export const buttonSizeClass = {
  md: "h-11 px-6",
  sm: "h-9 px-4",
} as const;

export const buttonBaseClass =
  "type-nav inline-flex items-center justify-center gap-(--space-2xs) transition-colors duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-40";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariantClass;
  size?: keyof typeof buttonSizeClass;
};

/** Rectangular by design — see BRAND_VISUAL_GUIDE §6, no radius on hover/press. */
export function Button({
  variant = "primary-dark",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonBaseClass,
        buttonVariantClass[variant],
        buttonSizeClass[size],
        className,
      )}
      {...props}
    />
  );
}

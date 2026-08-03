import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type TextLinkProps = ComponentProps<typeof Link> & {
  variant?: "plain" | "underlined";
  children: ReactNode;
};

/** `variant="underlined"` is the editorial link style: static underline that
 * lifts on hover, rather than appearing only on hover.
 *
 * The `py-1.5 -my-1.5` is hit area, not spacing. At `type-nav`'s 14px these
 * render ~19–21px tall, under the 24px WCAG 2.2 SC 2.5.8 asks for — measured
 * on a 390px viewport, where they are also being aimed at with a thumb. The
 * padding grows the border box, which is what gets hit-tested; the matching
 * negative margin keeps the layout footprint identical, so none of the ~46
 * call sites reflow. `min-h-11` would have been the obvious fix and is the
 * wrong one here: it forces `inline-flex`, which changes how every one of
 * those call sites lays out. */
export function TextLink({
  variant = "plain",
  className,
  children,
  ...props
}: TextLinkProps) {
  return (
    <Link
      className={cn(
        "type-nav -my-1.5 py-1.5 transition-colors duration-(--duration-fast)",
        variant === "plain" && "text-text-muted hover:text-text",
        variant === "underlined" &&
          "text-text decoration-border-strong hover:decoration-text underline decoration-1 underline-offset-4",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

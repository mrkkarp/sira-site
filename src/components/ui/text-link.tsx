import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type TextLinkProps = ComponentProps<typeof Link> & {
  variant?: "plain" | "underlined";
  children: ReactNode;
};

/** `variant="underlined"` is the editorial link style: static underline that
 * lifts on hover, rather than appearing only on hover. */
export function TextLink({
  variant = "plain",
  className,
  children,
  ...props
}: TextLinkProps) {
  return (
    <Link
      className={cn(
        "type-nav transition-colors duration-(--duration-fast)",
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

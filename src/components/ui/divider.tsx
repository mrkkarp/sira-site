import { cn } from "@/lib/cn";

export function Divider({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <hr
      className={cn(
        "border-border shrink-0 border-0",
        orientation === "horizontal"
          ? "h-px w-full border-t"
          : "h-full w-px border-l",
        className,
      )}
    />
  );
}

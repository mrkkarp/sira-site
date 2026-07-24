import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className"
> & {
  options: SelectOption[];
  className?: string;
};

/** A styled native `<select>` — deliberately not a custom listbox (native
 * gives correct keyboard/screen-reader behaviour for free). */
export function Select({ options, className, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "type-body-sm text-text border-border-strong bg-surface h-11 w-full appearance-none border px-(--space-sm) pr-(--space-lg)",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="text-text-muted pointer-events-none absolute top-1/2 right-(--space-sm) h-3 w-3 -translate-y-1/2"
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

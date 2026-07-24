import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function Checkbox({ label, id, className, ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "type-body-sm text-text inline-flex items-center gap-(--space-2xs)",
        className,
      )}
    >
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
          {...props}
        />
        <span
          aria-hidden="true"
          className="border-border-strong peer-checked:bg-text peer-checked:border-text pointer-events-none absolute inset-0 border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--color-focus)"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="text-background pointer-events-none relative h-3 w-3 scale-0 peer-checked:scale-100"
        >
          <path
            d="M3 8.5 6.5 12 13 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </span>
      {label}
    </label>
  );
}

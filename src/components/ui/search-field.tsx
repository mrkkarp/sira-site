"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  label: string;
  onValueChange?: (value: string) => void;
};

export function SearchField({
  label,
  onValueChange,
  className,
  defaultValue,
  id,
  ...props
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [value, setValue] = useState(String(defaultValue ?? ""));

  return (
    <div
      className={cn(
        "border-border-strong bg-surface flex h-11 items-center gap-(--space-2xs) border px-(--space-sm)",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="text-text-muted h-4 w-4 shrink-0"
      >
        <circle
          cx="11"
          cy="11"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="21"
          y1="21"
          x2="16.65"
          y2="16.65"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onValueChange?.(event.target.value);
        }}
        placeholder={label}
        className="type-body-sm text-text placeholder:text-text-muted h-full flex-1 bg-transparent outline-none"
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            onValueChange?.("");
          }}
          className="text-text-muted hover:text-text shrink-0"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

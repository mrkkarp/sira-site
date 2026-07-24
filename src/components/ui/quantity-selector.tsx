"use client";

import { useState } from "react";

export function QuantitySelector({
  label = "Quantity",
  min = 1,
  max = 99,
  defaultValue = 1,
  onChange,
}: {
  label?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  function set(next: number) {
    const clamped = Math.min(max, Math.max(min, next));
    setValue(clamped);
    onChange?.(clamped);
  }

  return (
    <div className="border-border-strong inline-flex h-11 items-stretch border">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => set(value - 1)}
        className="text-text hover:bg-surface-muted w-9 disabled:pointer-events-none disabled:opacity-40"
      >
        −
      </button>
      <output
        aria-label={label}
        className="type-technical-value text-text flex w-10 items-center justify-center"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => set(value + 1)}
        className="text-text hover:bg-surface-muted w-9 disabled:pointer-events-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

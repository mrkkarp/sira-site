"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

export type AccordionItemData = {
  id: string;
  trigger: ReactNode;
  content: ReactNode;
};

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
}: {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenIds));
  const baseId = useId();

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = allowMultiple ? new Set(prev) : new Set<string>();
      if (prev.has(id)) {
        if (!allowMultiple) return new Set();
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="divide-border divide-y">
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        const triggerId = `${baseId}-${item.id}-trigger`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="type-h4 text-text flex w-full items-center justify-between py-(--space-sm) text-left"
              >
                {item.trigger}
                <span
                  aria-hidden="true"
                  className={isOpen ? "rotate-45" : undefined}
                >
                  +
                </span>
              </button>
            </h3>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="type-body text-text-muted pb-(--space-sm)"
              >
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

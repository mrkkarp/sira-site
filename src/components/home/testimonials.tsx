"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { demoTestimonials } from "@/config/homepage";
import { cn } from "@/lib/cn";
import { Section, Container, SectionHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";

/**
 * Testimonials (Prompt 4 §11). No real reviews are on file — every quote
 * is explicitly marked as demo data, no known studio names are invented,
 * and there is no star rating (fake or otherwise). One large quote at a
 * time with simple prev/next navigation, no oversized quotation marks.
 */
export function Testimonials({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.home.testimonials;
  const items = demoTestimonials.map((entry, index) => ({
    ...entry,
    ...copy.items[index],
  }));
  const [active, setActive] = useState(0);
  const current = items[active];

  const go = (index: number) =>
    setActive((index + items.length) % items.length);

  return (
    <Section tone="muted" spacing="xl">
      <Container>
        <SectionHeader
          eyebrow={copy.eyebrow}
          heading={copy.heading}
          action={<Badge>{copy.demoLabel}</Badge>}
        />
        <div className="mt-(--space-lg) max-w-2xl">
          <blockquote className="type-h2 text-text">{current.quote}</blockquote>
          <p className="type-body text-text mt-(--space-md)">{current.name}</p>
          <p className="type-body-sm text-text-muted">{current.role}</p>

          <div className="mt-(--space-lg) flex items-center gap-(--space-sm)">
            <IconButton
              aria-label={copy.prevLabel}
              onClick={() => go(active - 1)}
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
            <div className="flex gap-(--space-2xs)">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`${index + 1}`}
                  aria-current={index === active}
                  onClick={() => setActive(index)}
                  className={cn(
                    "h-1 w-6 transition-colors duration-(--duration-fast)",
                    index === active ? "bg-text" : "bg-border",
                  )}
                />
              ))}
            </div>
            <IconButton
              aria-label={copy.nextLabel}
              onClick={() => go(active + 1)}
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}

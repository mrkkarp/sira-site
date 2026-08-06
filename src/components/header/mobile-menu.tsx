"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { locales, localeLabels, localeCodeLabels } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";
import { formatTemplate } from "@/lib/format-template";
import { cn } from "@/lib/cn";
import { catalogTree, primaryNav } from "@/config/navigation";
import { useDialogBehaviour } from "@/components/ui/use-dialog-behaviour";
import { BrandEyebrow } from "@/components/brand";

/**
 * The mobile navigation is a *different object* from the desktop bar, not the
 * same bar squashed: one fullscreen plane, one level of hierarchy visible at a
 * time, and every target sized for a thumb.
 *
 * Three deliberate departures from the version this replaces:
 *
 *  - **No screen stack.** The old drawer pushed you through
 *    root → catalog → sub-list with a Back button, so reaching "Накладні" cost
 *    two taps and lost your place. The catalogue is now the first thing on the
 *    plane, and the only two categories that split (sinks, planters) expand
 *    in place.
 *  - **Accordions, not routes.** Expanding is `aria-expanded` on a real
 *    button controlling a real region, so the state is announced rather than
 *    implied by a chevron.
 *  - **Languages live at the bottom**, out of the primary reading order but
 *    always reachable, instead of behind their own sub-screen.
 *
 * It is modal — it covers the page completely — so unlike the desktop
 * mega-menu it *does* trap focus, lock body scroll, and restore focus to the
 * trigger on close. Closing happens on the X, Escape, any link tap, and (via
 * `Header`) any route change or Back/Forward.
 */
export function MobileMenu({
  open,
  onClose,
  locale,
  dictionary,
}: {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);
  const m = dictionary.mobileMenu;
  const copy = dictionary.catalogNav;

  // Every open starts collapsed, so the plane looks the same each time.
  // Adjusted during render, not in an effect: the panel would otherwise paint
  // one frame with the previous session's accordion already open and then
  // collapse it.
  const [openedWith, setOpenedWith] = useState(open);
  if (openedWith !== open) {
    setOpenedWith(open);
    if (open) setExpanded(null);
  }

  // Focus trap, Escape, scroll lock and focus restore are shared with the
  // other modal overlays — see `useDialogBehaviour`. Focus starts on the X
  // rather than the first link, so the way out is the first thing announced.
  useDialogBehaviour({
    open,
    onClose,
    panelRef,
    initialFocusRef: closeButtonRef,
  });

  if (!open) return null;

  const bare = stripLocaleFromPathname(pathname, locales);
  const secondaryNav = primaryNav.filter((item) => !item.mega);
  // Index shared across both lists so the stagger reads as one continuous
  // cascade down the plane rather than restarting at each section.
  let row = 0;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={m.dialogLabel}
      className="bg-background fixed inset-0 z-50 flex [animation:menu-reveal_var(--duration-reveal)_var(--ease-nav)_both] flex-col"
    >
      <div className="border-border flex h-14 shrink-0 items-center justify-between border-b pr-(--space-2xs) pl-(--space-sm)">
        {/* `self-stretch` for the same reason as `Logo` — the glyph box is
            28px tall, which is under the 44px minimum, and this is the home
            link on the viewport where that matters most. */}
        <Link
          href={localeHref(locale, "/")}
          onClick={onClose}
          className="flex items-center self-stretch font-serif text-xl tracking-tight"
          aria-label="ODUDLAB — home"
        >
          ODUDLAB
        </Link>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label={m.closeLabel}
          onClick={onClose}
          className="group hover:bg-text/5 flex h-14 w-14 items-center justify-center transition-colors duration-(--duration-normal)"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:rotate-90"
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-(--space-sm) py-(--space-md)">
        <BrandEyebrow>{copy.eyebrow}</BrandEyebrow>
        <ul className="mt-(--space-2xs)">
          {catalogTree.map((node) => {
            const index = row++;
            const isExpanded = expanded === node.href;
            const panelId = `mobile-cat-${node.labelKey}`;

            return (
              <li
                key={node.href}
                style={{ "--i": index } as CSSProperties}
                className="nav-row border-border border-b"
              >
                <div className="flex items-center">
                  <Link
                    href={localeHref(locale, node.href)}
                    onClick={onClose}
                    className="type-h2 text-text flex min-h-12 flex-1 items-center py-(--space-2xs)"
                  >
                    {copy[node.labelKey as keyof typeof copy]}
                  </Link>
                  {node.children ? (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      // Not the bare category name: that is already the name of
                      // the `Link` sitting immediately to the left, so the row
                      // read as "Умивальники, посилання" followed by
                      // "Умивальники, кнопка" — two differently-behaving
                      // controls announced identically, with only the visual
                      // plus icon to tell them apart. `aria-expanded` carries
                      // the open/closed state; the name has to carry what the
                      // button is *for*.
                      aria-label={formatTemplate(m.subcategoriesCta, {
                        name: copy[node.labelKey as keyof typeof copy],
                      })}
                      onClick={() => setExpanded(isExpanded ? null : node.href)}
                      className="flex h-12 w-12 shrink-0 items-center justify-center"
                    >
                      {/* A plus that becomes a minus: the vertical stroke
                          rotates away rather than the whole icon swapping. */}
                      <span
                        aria-hidden="true"
                        className="relative block h-4 w-4"
                      >
                        <span className="bg-text absolute top-1/2 left-0 h-px w-full -translate-y-1/2" />
                        <span
                          className={cn(
                            "bg-text absolute top-0 left-1/2 h-full w-px -translate-x-1/2 transition-transform duration-(--duration-normal) ease-(--ease-nav)",
                            isExpanded ? "scale-y-0 rotate-90" : "rotate-0",
                          )}
                        />
                      </span>
                    </button>
                  ) : null}
                </div>

                {node.children ? (
                  <div
                    id={panelId}
                    className={cn(
                      "grid transition-[grid-template-rows] duration-(--duration-normal) ease-(--ease-nav)",
                      isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <ul className="overflow-hidden">
                      {node.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={localeHref(locale, child.href)}
                            onClick={onClose}
                            tabIndex={isExpanded ? undefined : -1}
                            className="type-body-lg text-text-muted flex min-h-11 items-center pl-(--space-sm)"
                          >
                            {copy[child.labelKey as keyof typeof copy]}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <ul className="mt-(--space-lg)">
          {secondaryNav.map((item) => {
            const index = row++;
            return (
              <li
                key={item.key}
                style={{ "--i": index } as CSSProperties}
                className="nav-row border-border border-b"
              >
                <Link
                  href={localeHref(locale, item.href)}
                  onClick={onClose}
                  aria-current={bare === item.href ? "page" : undefined}
                  className="type-nav text-text flex min-h-12 items-center py-(--space-2xs) tracking-[0.06em] uppercase"
                >
                  {dictionary.nav[item.key as keyof typeof dictionary.nav]}
                </Link>
              </li>
            );
          })}
          <li
            style={{ "--i": row++ } as CSSProperties}
            className="nav-row border-border border-b"
          >
            <Link
              href={localeHref(locale, "/contact")}
              onClick={onClose}
              aria-current={bare === "/contact" ? "page" : undefined}
              className="type-nav text-text flex min-h-12 items-center py-(--space-2xs) tracking-[0.06em] uppercase"
            >
              {dictionary.nav.contact}
            </Link>
          </li>
        </ul>
      </div>

      <div className="border-border flex shrink-0 items-center justify-between border-t px-(--space-sm) py-(--space-2xs)">
        <span className="type-eyebrow text-text-muted">{m.language}</span>
        <ul className="type-label flex items-center">
          {locales.map((candidate) => {
            const isCurrent = candidate === locale;
            return (
              <li key={candidate}>
                <Link
                  href={localeHref(candidate, bare)}
                  onClick={onClose}
                  title={localeLabels[candidate]}
                  aria-current={isCurrent ? "true" : undefined}
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center uppercase",
                    isCurrent ? "text-text" : "text-text-muted",
                  )}
                >
                  {localeCodeLabels[candidate]}
                  {isCurrent ? (
                    <span
                      aria-hidden="true"
                      className="bg-text absolute inset-x-(--space-2xs) bottom-2 h-px"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

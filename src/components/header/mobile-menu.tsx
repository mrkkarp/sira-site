"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { locales, localeLabels } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";
import { usePathname } from "next/navigation";
import {
  catalogMenu,
  catalogMenuColours,
  collectionsMenu,
  brandMenu,
  designersMenu,
  type NavLink,
} from "@/config/navigation";

type Screen =
  "root" | "catalog" | "collections" | "brand" | "designers" | "language";

function LinkGroup({
  heading,
  items,
  labels,
  locale,
  onNavigate,
}: {
  heading?: string;
  items: NavLink[];
  labels: Record<string, string>;
  locale: Locale;
  onNavigate: () => void;
}) {
  return (
    <div>
      {heading ? (
        <h3 className="type-technical-label text-text-muted mb-(--space-2xs)">
          {heading}
        </h3>
      ) : null}
      <ul className="flex flex-col gap-(--space-xs)">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={localeHref(locale, item.href)}
              onClick={onNavigate}
              className="type-body-lg text-text block py-(--space-3xs)"
            >
              {labels[item.labelKey]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  const [screen, setScreen] = useState<Screen>("root");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const pathname = usePathname();
  const m = dictionary.mobileMenu;

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => setScreen("root"), 0);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const container = panelRef.current?.parentElement;
      const focusable = container?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const bare = stripLocaleFromPathname(pathname, locales);

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col overflow-y-auto">
      <div className="border-border flex items-center justify-between border-b p-(--space-sm)">
        <span className="font-serif text-lg">ODUDLAB</span>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label={m.closeLabel}
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>

      <div ref={panelRef} className="flex-1 p-(--space-md)">
        {screen === "root" ? (
          <nav aria-label={m.openLabel}>
            <ul className="flex flex-col gap-(--space-2xs)">
              <li>
                <button
                  type="button"
                  onClick={() => setScreen("catalog")}
                  className="type-body-lg text-text flex w-full items-center justify-between py-(--space-2xs)"
                >
                  {dictionary.nav.shop}
                  <ChevronRight />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setScreen("collections")}
                  className="type-body-lg text-text flex w-full items-center justify-between py-(--space-2xs)"
                >
                  {dictionary.nav.collections}
                  <ChevronRight />
                </button>
              </li>
              <li>
                <Link
                  href={localeHref(locale, "/colours")}
                  onClick={onClose}
                  className="type-body-lg text-text block py-(--space-2xs)"
                >
                  {dictionary.nav.colours}
                </Link>
              </li>
              <li>
                <Link
                  href={localeHref(locale, "/projects")}
                  onClick={onClose}
                  className="type-body-lg text-text block py-(--space-2xs)"
                >
                  {dictionary.nav.projects}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setScreen("brand")}
                  className="type-body-lg text-text flex w-full items-center justify-between py-(--space-2xs)"
                >
                  {dictionary.nav.brand}
                  <ChevronRight />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setScreen("designers")}
                  className="type-body-lg text-text flex w-full items-center justify-between py-(--space-2xs)"
                >
                  {dictionary.nav.designers}
                  <ChevronRight />
                </button>
              </li>
              <li>
                <Link
                  href={localeHref(locale, "/contact")}
                  onClick={onClose}
                  className="type-body-lg text-text block py-(--space-2xs)"
                >
                  {dictionary.nav.contact}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setScreen("language")}
                  className="type-body-lg text-text flex w-full items-center justify-between py-(--space-2xs)"
                >
                  {m.language}
                  <ChevronRight />
                </button>
              </li>
            </ul>
          </nav>
        ) : null}

        {screen === "catalog" ? (
          <div>
            <BackButton
              label={dictionary.nav.shop}
              text={m.back}
              onBack={() => setScreen("root")}
            />
            <div className="flex flex-col gap-(--space-lg)">
              <LinkGroup
                heading={dictionary.megaMenu.catalog.categoriesHeading}
                items={catalogMenu.categories}
                labels={dictionary.megaMenu.catalog}
                locale={locale}
                onNavigate={onClose}
              />
              <LinkGroup
                heading={dictionary.megaMenu.catalog.sinkTypeHeading}
                items={catalogMenu.sinkTypes}
                labels={dictionary.megaMenu.catalog}
                locale={locale}
                onNavigate={onClose}
              />
              <LinkGroup
                heading={dictionary.megaMenu.catalog.shapeHeading}
                items={catalogMenu.shapes}
                labels={dictionary.megaMenu.catalog}
                locale={locale}
                onNavigate={onClose}
              />
              <div>
                <h3 className="type-technical-label text-text-muted mb-(--space-2xs)">
                  {dictionary.megaMenu.catalog.coloursHeading}
                </h3>
                <div className="grid grid-cols-5 gap-(--space-2xs)">
                  {catalogMenuColours.map((colour) => (
                    <Link
                      key={colour.href}
                      href={localeHref(locale, colour.href)}
                      onClick={onClose}
                      aria-label={
                        dictionary.megaMenu.colours[
                          colour.labelKey as keyof typeof dictionary.megaMenu.colours
                        ]
                      }
                      className="border-border-strong block h-10 w-10 border"
                      style={{ backgroundColor: colour.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {screen === "collections" ? (
          <div>
            <BackButton
              label={dictionary.nav.collections}
              text={m.back}
              onBack={() => setScreen("root")}
            />
            <LinkGroup
              items={collectionsMenu}
              labels={dictionary.megaMenu.collections}
              locale={locale}
              onNavigate={onClose}
            />
          </div>
        ) : null}

        {screen === "brand" ? (
          <div>
            <BackButton
              label={dictionary.nav.brand}
              text={m.back}
              onBack={() => setScreen("root")}
            />
            <LinkGroup
              items={brandMenu}
              labels={dictionary.megaMenu.brand}
              locale={locale}
              onNavigate={onClose}
            />
          </div>
        ) : null}

        {screen === "designers" ? (
          <div>
            <BackButton
              label={dictionary.nav.designers}
              text={m.back}
              onBack={() => setScreen("root")}
            />
            <LinkGroup
              items={designersMenu}
              labels={dictionary.megaMenu.designers}
              locale={locale}
              onNavigate={onClose}
            />
          </div>
        ) : null}

        {screen === "language" ? (
          <div>
            <BackButton
              label={m.language}
              text={m.back}
              onBack={() => setScreen("root")}
            />
            <ul className="flex flex-col gap-(--space-xs)">
              {locales.map((candidate) => (
                <li key={candidate}>
                  <Link
                    href={localeHref(candidate, bare)}
                    onClick={onClose}
                    aria-current={candidate === locale ? "true" : undefined}
                    className="type-body-lg text-text block py-(--space-3xs)"
                  >
                    {localeLabels[candidate]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3">
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function BackButton({
  label,
  text,
  onBack,
}: {
  label: string;
  text: string;
  onBack: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="type-nav text-text mb-(--space-md) flex items-center gap-(--space-2xs)"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3 w-3 -scale-x-100"
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          transform="rotate(90 8 8)"
        />
      </svg>
      {text} · {label}
    </button>
  );
}

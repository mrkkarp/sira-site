import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { contact } from "@/config/contact";
import {
  footerBrandLinks,
  footerCatalogLinks,
  footerCustomerLinks,
  footerDesignerLinks,
  footerLegalLinks,
} from "@/config/footer-nav";
import type { NavLink } from "@/config/navigation";
import { CustomerCareSummary } from "@/components/footer/customer-care-summary";
import { Accordion } from "@/components/ui/accordion";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { AccordionItemData } from "@/components/ui/accordion";
import { drawingIndex } from "@/components/technical-drawing";
import { HoopoeCrest } from "@/components/brand";

// `inline-block` + padding, because vertical padding on an inline box does not
// grow the line: a 19px-tall link is under the 24px minimum target (WCAG 2.5.8)
// and every footer list failed it on a phone. The padding is invisible and the
// lists lose the same 4px from their gap, so the type does not move.
const linkClass =
  "text-background/85 hover:text-background transition-colors duration-(--duration-fast) inline-block py-(--space-3xs)";

function resolveLinks(
  links: NavLink[],
  resolver: (labelKey: string) => string,
): Array<{ label: string; href: string }> {
  return links.map((link) => ({
    label: resolver(link.labelKey),
    href: link.href,
  }));
}

function LinkColumn({
  heading,
  links,
  locale,
  index,
}: {
  heading: string;
  links: Array<{ label: string; href: string }>;
  locale: Locale;
  index: number;
}) {
  return (
    <div>
      <h2 className="type-technical-label text-background/60 flex items-center gap-(--drawing-gap)">
        {/* Column number in the drawing's voice. `aria-hidden` so the heading
            is still announced as just the section name.

            It carries the brand accent, and the earlier note here still holds:
            a position number must never be a *fainter* mark than the name it
            indexes. `--brand-accent-on-dark` measures 5.75:1 on this band and
            the surrounding `text-background/60` resolves to ~5.8:1, so this
            changes the hue and not the weight — which is the only way to
            colour a number on a technical sheet without demoting it. Tinting
            it down was worth 2.9:1, a number you can only find if you already
            know it is there; this is not that. */}
        <span aria-hidden="true" className="text-brand-accent-on-dark">
          {drawingIndex(index)}
        </span>
        {heading}
      </h2>
      <ul className="type-body-sm mt-(--space-sm) flex flex-col gap-(--space-3xs)">
        {/* The key is the href alone, never `href + label`. React keys are
            serialised verbatim into the RSC flight payload, and Googlebot
            scrapes that inline script for URL-shaped strings — a key like
            "/coloursКольори" was being crawled as a relative URL and reported
            as a 404 in Search Console. Hrefs are unique inside every column,
            so this is also the correct key. */}
        {links.map((link) => (
          <li key={link.href}>
            <Link href={localeHref(locale, link.href)} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Dark "production mode" footer per BRAND_VISUAL_GUIDE §2.4: ODUDLAB info,
 * five link columns, a customer-care summary band, then the legal/locale
 * bottom row. Desktop shows six columns as a grid; below `md` the link
 * columns collapse into a keyboard-accessible Accordion (first section open
 * by default).
 *
 * ПРОМПТ 3 also specified a newsletter strip above this and a "Замовити
 * дзвінок" form inside the ODUDLAB column. Both were removed at the owner's
 * request — the site is not to collect subscriptions or call-back requests —
 * so do not reinstate them from the prompt. The `/api/newsletter` and
 * `/api/callback` endpoints went with them; only the contact, quote,
 * designer, warranty and sample forms remain.
 */
export function Footer({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const catalogLinks = resolveLinks(
    footerCatalogLinks,
    (key) =>
      dictionary.megaMenu.catalog[
        key as keyof typeof dictionary.megaMenu.catalog
      ],
  );
  const customerLinks = resolveLinks(
    footerCustomerLinks,
    (key) => dictionary.footerLinks[key as keyof typeof dictionary.footerLinks],
  );
  const designerLinks = resolveLinks(
    footerDesignerLinks,
    (key) =>
      dictionary.megaMenu.designers[
        key as keyof typeof dictionary.megaMenu.designers
      ],
  );
  const brandLinks = resolveLinks(
    footerBrandLinks,
    (key) => dictionary.footerNav[key as keyof typeof dictionary.footerNav],
  );
  const legalLinks = resolveLinks(
    footerLegalLinks,
    (key) => dictionary.footerNav[key as keyof typeof dictionary.footerNav],
  );

  const contactBlock = (
    // `data-analytics-location` is read by `ContactLinkTracker` to tell a phone
    // tap in the footer apart from one on the contact page. A plain attribute,
    // deliberately: an `onClick` here would turn the footer — which is on every
    // page — into a Client Component and ship its whole markup twice.
    <div data-analytics-location="footer" className="col-span-2 lg:col-span-1">
      {/* The one place on the site where the bird appears outside the logo.
          The footer is where a maker signs the sheet, and this column is the
          only block on any page whose subject is ODUDLAB itself — so the crest
          sits above the name here and nowhere else. It is `aria-hidden` and
          the name is right beneath it in real text, so nothing is lost by
          skipping it. */}
      <HoopoeCrest className="mb-(--space-2xs)" tone="dark" />
      <p className="type-h4 text-background font-serif">
        {dictionary.site.name}
      </p>
      <p className="type-body-sm text-background/70 mt-(--space-2xs) max-w-xs">
        {dictionary.footerNav.brandDescription}
      </p>

      <dl className="type-body-sm text-background/85 mt-(--space-sm) flex flex-col gap-(--space-2xs)">
        <div>
          <dt className="sr-only">{dictionary.footerNav.addressLabel}</dt>
          <dd>{contact.address.line}</dd>
        </div>
        <div>
          <dt className="sr-only">{dictionary.footerNav.emailLabel}</dt>
          <dd>
            <a href={`mailto:${contact.email}`} className={linkClass}>
              {contact.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="sr-only">{dictionary.footerNav.phoneLabel}</dt>
          <dd>
            <a href={`tel:${contact.phone.href}`} className={linkClass}>
              {contact.phone.display}
            </a>
          </dd>
        </div>
      </dl>

      <ul className="type-body-sm mt-(--space-sm) flex flex-wrap items-center gap-(--space-xs)">
        <li>
          <a
            href={contact.instagram.url}
            className={linkClass}
            target="_blank"
            rel="noreferrer"
          >
            {dictionary.footerNav.instagramLabel}
          </a>
        </li>
        <li aria-hidden="true" className="text-background/30">
          /
        </li>
        <li>
          <a href={contact.viberHref} className={linkClass}>
            {dictionary.footerNav.viberLabel}
          </a>
        </li>
        <li aria-hidden="true" className="text-background/30">
          /
        </li>
        <li>
          <a
            href={contact.telegramHref}
            className={linkClass}
            target="_blank"
            rel="noreferrer"
          >
            {dictionary.footerNav.telegramLabel}
          </a>
        </li>
      </ul>
    </div>
  );

  const accordionItems: AccordionItemData[] = [
    {
      id: "catalog",
      trigger: dictionary.footerNav.catalogHeading,
      content: (
        <ul className="type-body-sm flex flex-col gap-(--space-3xs)">
          {/* Href alone as the key — see `FooterColumn` above. */}
          {catalogLinks.map((link) => (
            <li key={link.href}>
              <Link href={localeHref(locale, link.href)} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "customers",
      trigger: dictionary.footerNav.customersHeading,
      content: (
        <ul className="type-body-sm flex flex-col gap-(--space-3xs)">
          {/* Href alone as the key — see `FooterColumn` above. */}
          {customerLinks.map((link) => (
            <li key={link.href}>
              <Link href={localeHref(locale, link.href)} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "designers",
      trigger: dictionary.footerNav.designersHeading,
      content: (
        <ul className="type-body-sm flex flex-col gap-(--space-3xs)">
          {/* Href alone as the key — see `FooterColumn` above. */}
          {designerLinks.map((link) => (
            <li key={link.href}>
              <Link href={localeHref(locale, link.href)} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "brand",
      trigger: dictionary.footerNav.brandHeading,
      content: (
        <ul className="type-body-sm flex flex-col gap-(--space-3xs)">
          {/* Href alone as the key — see `FooterColumn` above. */}
          {brandLinks.map((link) => (
            <li key={link.href}>
              <Link href={localeHref(locale, link.href)} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "legal",
      trigger: dictionary.footerNav.legalHeading,
      content: (
        <ul className="type-body-sm flex flex-col gap-(--space-3xs)">
          {/* Href alone as the key — see `FooterColumn` above. */}
          {legalLinks.map((link) => (
            <li key={link.href}>
              <Link href={localeHref(locale, link.href)} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <footer className="bg-footer text-background border-t border-white/10">
      <div className="px-6 py-(--space-lg)">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-(--space-lg) lg:hidden">
          {contactBlock}
        </div>
        <div className="mx-auto max-w-7xl lg:hidden">
          <Accordion
            items={accordionItems}
            allowMultiple
            defaultOpenIds={["catalog"]}
            indexed
            tone="onDark"
          />
        </div>

        <div className="mx-auto hidden max-w-7xl grid-cols-6 gap-(--space-lg) lg:grid">
          {contactBlock}
          <LinkColumn
            heading={dictionary.footerNav.catalogHeading}
            links={catalogLinks}
            locale={locale}
            index={1}
          />
          <LinkColumn
            heading={dictionary.footerNav.customersHeading}
            links={customerLinks}
            locale={locale}
            index={2}
          />
          <LinkColumn
            heading={dictionary.footerNav.designersHeading}
            links={designerLinks}
            locale={locale}
            index={3}
          />
          <LinkColumn
            heading={dictionary.footerNav.brandHeading}
            links={brandLinks}
            locale={locale}
            index={4}
          />
          <LinkColumn
            heading={dictionary.footerNav.legalHeading}
            links={legalLinks}
            locale={locale}
            index={5}
          />
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-(--space-md)">
        <div className="mx-auto max-w-7xl">
          <CustomerCareSummary locale={locale} dictionary={dictionary} />
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-(--space-sm)">
        <div className="type-caption text-background/50 mx-auto flex max-w-7xl flex-col flex-wrap items-start gap-(--space-2xs) sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {dictionary.site.name}.{" "}
            {dictionary.footerNav.copyright}
          </p>
          <div className="flex flex-wrap items-center gap-(--space-sm)">
            {/* The sheet's origin line, in the drawing's voice. Deliberately
                not a title block: three real values on one line, no revision
                or sheet-number fields, and no version string — nothing here
                generates one, and inventing a build number would make the
                footer claim something the site cannot back up. */}
            <span className="type-drawing-label">
              {dictionary.site.name} / {dictionary.footerNav.cityValue} /{" "}
              {dictionary.footerNav.regionValue}
            </span>
            {/* `inverted` derives both states from `currentColor`, so it needs
                one that belongs to this band: inheriting the row's `/50` put
                the two unselected locales at 2.8:1 on the dark footer. */}
            <span className="text-background">
              <LocaleSwitcher locale={locale} inverted />
            </span>
          </div>
        </div>
        {/*
          Payment-method icons are intentionally omitted — no payment
          processor is actually connected yet (LiqPay is described in the
          customer-care summary as a confirmed method, but no logo/badge
          set has been supplied by the owner). Add real, licensed icons
          here once integration is live; never show invented logos.
        */}
      </div>
    </footer>
  );
}

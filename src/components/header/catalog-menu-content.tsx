import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { catalogMenu, catalogMenuColours } from "@/config/navigation";

function ColumnLinks({
  items,
  labels,
  locale,
}: {
  items: { labelKey: string; href: string }[];
  labels: Record<string, string>;
  locale: Locale;
}) {
  return (
    <ul className="flex flex-col gap-(--space-2xs)">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={localeHref(locale, item.href)}
            className="type-body-sm text-text-muted hover:text-text transition-colors duration-(--duration-fast)"
          >
            {labels[item.labelKey]}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CatalogMenuContent({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const c = dictionary.megaMenu.catalog;
  const colours = dictionary.megaMenu.colours;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-5 gap-(--space-lg) px-6 py-(--space-lg)">
      <div>
        <h3 className="type-technical-label text-text-muted mb-(--space-sm)">
          {c.categoriesHeading}
        </h3>
        <ColumnLinks
          items={catalogMenu.categories}
          labels={c}
          locale={locale}
        />
      </div>

      <div>
        <h3 className="type-technical-label text-text-muted mb-(--space-sm)">
          {c.sinkTypeHeading}
        </h3>
        <ColumnLinks items={catalogMenu.sinkTypes} labels={c} locale={locale} />
      </div>

      <div>
        <h3 className="type-technical-label text-text-muted mb-(--space-sm)">
          {c.shapeHeading}
        </h3>
        <ColumnLinks items={catalogMenu.shapes} labels={c} locale={locale} />
      </div>

      <div>
        <h3 className="type-technical-label text-text-muted mb-(--space-sm)">
          {c.coloursHeading}
        </h3>
        <div className="grid grid-cols-4 gap-(--space-2xs)">
          {catalogMenuColours.map((colour) => (
            <Link
              key={colour.href}
              href={localeHref(locale, colour.href)}
              title={colours[colour.labelKey as keyof typeof colours]}
              aria-label={colours[colour.labelKey as keyof typeof colours]}
              className="border-border-strong block h-8 w-8 border"
              style={{ backgroundColor: colour.hex }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="type-eyebrow text-text-muted">{c.editorialEyebrow}</p>
        <div
          role="img"
          aria-label={c.editorialImageAlt}
          className="bg-surface-muted mt-(--space-2xs) aspect-[4/5] w-full"
        />
        <p className="type-h4 text-text mt-(--space-sm)">{c.editorialTitle}</p>
        <Link
          href={localeHref(locale, "/collections/outdoor")}
          className="type-nav text-text mt-(--space-2xs) inline-block underline underline-offset-4"
        >
          {c.editorialCta}
        </Link>
      </div>
    </div>
  );
}

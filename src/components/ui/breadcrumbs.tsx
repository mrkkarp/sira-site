import Link from "next/link";

export type Crumb = { label: string; href?: string };

/**
 * The crumb links carry `py-1.5 -my-1.5` purely as hit area. `type-caption`
 * renders them ~17px tall — the thinnest touch targets on the site, well under
 * the 24px WCAG 2.2 SC 2.5.8 asks for, and they sit at the top of the page
 * where a thumb reaches least accurately.
 *
 * Each crumb is a flex *item*, not an inline box, so padding alone would push
 * the whole bar 12px taller; the matching negative margin pulls the layout
 * footprint back to 17px while the border box — which is what gets
 * hit-tested — stays at 29px. Nothing can be occluded by the overflow: the
 * "/" separators are `aria-hidden` spans, and the bar sits in its own row.
 */

export function Breadcrumbs({
  items,
  label = "Breadcrumb",
}: {
  items: Crumb[];
  label?: string;
}) {
  return (
    <nav aria-label={label}>
      <ol className="type-caption text-text-muted flex flex-wrap items-center gap-(--space-3xs)">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-(--space-3xs)"
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-text -my-1.5 py-1.5 transition-colors duration-(--duration-fast)"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? <span aria-hidden="true">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

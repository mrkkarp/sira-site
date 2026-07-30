import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product } from "@/lib/schemas/product";
import { getInstallationSpecEntries } from "@/lib/product-installation";
import { getProductDocuments } from "@/lib/product-documents";
import { Accordion, type AccordionItemData } from "@/components/ui/accordion";
import { ProductSpecs } from "@/components/product/product-specs";

/**
 * Product page accordion — Prompt 6 §11 (Характеристики / Доставка / Монтаж
 * / Догляд / Документи / Гарантія / Запитання).
 *
 * Every section here is backed by real data:
 * - Характеристики: the product's own parsed spec entries (omitted when empty).
 * - Доставка / Гарантія / Догляд: the same real, confirmed company-wide
 *   payment/delivery/warranty/care copy already used on the footer and
 *   customer-care pages (`dictionary.customerCare`) — not re-invented here.
 * - Монтаж: only the real installation/connection spec entries that exist
 *   for this specific product (omitted when there are none).
 * - Документи: real per-product files if any exist (none do today — see
 *   `getProductDocuments`), otherwise the honest "not uploaded yet" message.
 *
 * "Запитання" (FAQ) is deliberately NOT included: there is no real
 * per-product or general FAQ content anywhere in the source data, and
 * fabricating Q&A would violate the zero-fabrication rule. Documented as a
 * "needs real ODUDLAB data" gap in the final report.
 */
export function ProductDetailsAccordion({
  product,
  dictionary,
}: {
  product: Product;
  dictionary: Dictionary;
}) {
  const copy = dictionary.product;
  const care = dictionary.customerCare;

  const items: AccordionItemData[] = [];

  if (product.specEntries.length > 0) {
    items.push({
      id: "specs",
      trigger: copy.accordionSpecs,
      content: <ProductSpecs specEntries={product.specEntries} />,
    });
  }

  items.push({
    id: "delivery",
    trigger: copy.accordionDelivery,
    content: (
      <ul className="flex flex-col gap-(--space-3xs)">
        <li>{care.deliveryPickup}</li>
        <li>{care.deliveryNovaPoshta}</li>
        <li>{care.deliveryCourier}</li>
        <li>{care.deliveryCustom}</li>
      </ul>
    ),
  });

  const installationEntries = getInstallationSpecEntries(product.specEntries);
  if (installationEntries.length > 0) {
    items.push({
      id: "installation",
      trigger: copy.accordionInstallation,
      content: <ProductSpecs specEntries={installationEntries} />,
    });
  }

  items.push({
    id: "care",
    trigger: copy.accordionCare,
    content: (
      <ul className="flex flex-col gap-(--space-3xs)">
        <li>{care.careNoAbrasive}</li>
        <li>{care.careNoAcid}</li>
        <li>{care.careCleanPromptly}</li>
        <li>{care.careAvoidImpact}</li>
      </ul>
    ),
  });

  const documents = getProductDocuments(product);
  items.push({
    id: "documents",
    trigger: copy.accordionDocuments,
    content:
      documents.length > 0 ? (
        <ul className="flex flex-col gap-(--space-2xs)">
          {documents.map((doc) => (
            <li key={doc.href}>
              <a
                href={doc.href}
                target={doc.external ? "_blank" : undefined}
                rel={doc.external ? "noopener noreferrer" : undefined}
                className="text-text underline underline-offset-2"
              >
                {doc.name} ({doc.format}
                {doc.sizeLabel ? `, ${doc.sizeLabel}` : ""})
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>{copy.noDocuments}</p>
      ),
  });

  items.push({
    id: "warranty",
    trigger: copy.accordionWarranty,
    content: <p>{care.warrantyBody}</p>,
  });

  return <Accordion items={items} />;
}

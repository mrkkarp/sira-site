import type { Product } from "@/lib/schemas/product";

/**
 * A single real, downloadable document (PDF spec sheet, technical drawing,
 * care instructions, warranty card, BIM/DWG/SKP/OBJ/STL file...) per
 * Prompt 6 §10. Deliberately requires a real `href` — never render an item
 * without one, since an empty/placeholder link is explicitly forbidden.
 */
export interface ProductDocument {
  name: string;
  format: string;
  sizeLabel?: string;
  language?: string;
  href: string;
  external?: boolean;
}

/**
 * Returns the real documents available for a product. There are currently
 * ZERO document files (PDFs, drawings, BIM assets, etc.) anywhere in this
 * repository or the source export — `products.source.json` has no such
 * field, and no `/public` assets of that kind exist. So this always returns
 * an empty array today; `ProductDocumentsAccordion` renders the honest
 * "not yet uploaded" message instead of a broken/empty link. The moment
 * real document files + metadata exist, wire them in here rather than
 * fabricating placeholder entries.
 */
export function getProductDocuments(product: Product): ProductDocument[] {
  void product;
  return [];
}

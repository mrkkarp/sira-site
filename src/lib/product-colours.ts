import "server-only";
import rawColours from "@/data/product-colours.json";
import { ProductColourSchema, type ProductColour } from "@/lib/schemas/colour";
import { z } from "zod";

const ProductColourFileSchema = z.array(ProductColourSchema);

let cached: ProductColour[] | null = null;

export function getAllProductColours(): ProductColour[] {
  if (!cached) {
    cached = ProductColourFileSchema.parse(rawColours);
  }
  return cached;
}

export function getProductColourBySlug(
  slug: string,
): ProductColour | undefined {
  return getAllProductColours().find((colour) => colour.slug === slug);
}

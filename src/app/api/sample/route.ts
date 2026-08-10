import type { NextRequest } from "next/server";
import { z } from "zod";
import { ProductId } from "@/domain/shared/ids";
import { PhoneNumber } from "@/domain/shared/phone";
import {
  handleLeadSubmission,
  type LeadEndpointResponse,
} from "@/lib/forms/lead-endpoint";

export type SampleRequestResponse = LeadEndpointResponse;

/**
 * "Замовити зразок кольору" — the low-commitment step on the way to a
 * 19 600 UAH made-to-order object.
 *
 * `address` is required because the whole point is that something physical
 * gets posted; a sample request without somewhere to send it is not a
 * request, it is a message. `message` carries which colours or finishes are
 * wanted, in the customer's own words — see `SampleRequestSchema` for why
 * that is free text rather than a palette picker.
 */
const SampleFormInput = z.object({
  name: z.string().trim().min(1),
  phone: PhoneNumber,
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().min(1),
  message: z.string().trim().optional().or(z.literal("")),
  /**
   * Present only when the request came from a product page. Accepted, then
   * dropped at write time while the catalogue is keyed by slug — see
   * `toPayloadRelationId`. It is still worth sending: the moment products
   * carry real Payload ids the relation starts being stored with no change
   * here, and until then the product name is in `message` anyway.
   */
  productIds: z.array(ProductId).optional(),
  /**
   * Measurement only, and not stored.
   *
   * A sample asked for from a product page is worth that product's price, and
   * that is what the pixel already reports from the browser. Meta keeps
   * whichever copy of a deduplicated event arrives first — usually the server's
   * — so without the SKU here the server copy would arrive valueless and quietly
   * discard the real figure. The price itself is never taken from the body: the
   * SKU is looked up against the catalogue server-side.
   */
  variantSku: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  return handleLeadSubmission({
    request,
    form: "sample",
    schema: SampleFormInput,
    toLead: (input, { locale, sourcePath }) => ({
      type: "sample",
      status: "new",
      locale,
      sourcePath,
      name: input.name,
      phone: input.phone,
      email: input.email || undefined,
      address: input.address,
      productIds: input.productIds ?? [],
      message: input.message || undefined,
    }),
    metaProduct: (input) => ({
      productSlug: input.productIds?.[0],
      variantSku: input.variantSku,
    }),
  });
}

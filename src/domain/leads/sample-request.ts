import { z } from "zod";
import { ProductId } from "../shared/ids";
import { PhoneNumber } from "../shared/phone";
import { leadCommonFields } from "./lead-common";

/**
 * `SampleRequest` (Prompt 8 §12) — a request for physical material/finish
 * samples to be mailed out, hence the mandatory shipping `address` (distinct
 * from `DeliveryMethod`, which is checkout-specific and models Nova
 * Poshta/courier/pickup — a sample request is simpler and always postal).
 */
export const SampleRequestSchema = z.object({
  ...leadCommonFields,
  type: z.literal("sample"),
  name: z.string().min(1),
  phone: PhoneNumber,
  email: z.string().email().optional(),
  address: z.string().min(1),
  /**
   * Which catalogue items the samples relate to — possibly none.
   *
   * This was `.min(1)`, and nothing in the system could satisfy it. A
   * storefront `ProductId` is the product's *slug*; `Leads.productIds` is a
   * Payload relationship field that only accepts a numeric document id, so
   * `buildLeadData` necessarily drops every slug it is handed (there is a
   * test asserting exactly that, and the same already happens to `quote`).
   * A sample request written from any real page therefore stored an empty
   * array, and `create()` re-parses what it wrote — so the constraint did not
   * reject bad input, it turned every successful write into a 500 after the
   * lead had already been saved.
   *
   * A constraint the only write path in the system cannot meet is not a
   * constraint. The human-readable answer in `message` is what actually
   * reaches staff meanwhile, exactly as it does for `quote`.
   */
  productIds: z.array(ProductId),
  /**
   * Free text: which colours or finishes the sample is for.
   *
   * Deliberately not a pick-list of colour ids. Five of the six entries in
   * `src/data/product-colours.json` are flagged `demo: true` with "відтінок і
   * код RAL/NCS ще не підтверджені майстернею", and none is marked
   * `physicalSampleAvailable`. Rendering them as choosable samples would be
   * offering to post pigments nobody has confirmed exist. When the workshop
   * confirms the palette this can become a real selector; until then the
   * customer says it in their own words and staff reply.
   */
  message: z.string().optional(),
});
export type SampleRequest = Readonly<z.infer<typeof SampleRequestSchema>>;

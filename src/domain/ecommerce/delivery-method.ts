import { z } from "zod";
import { StockistId } from "../shared/ids";

/**
 * `DeliveryMethod` (Prompt 8 §2.3) — a discriminated union rather than a
 * flat "shipping address" object, because each delivery type needs
 * different required fields (a Nova Poshta branch needs a branch
 * number, not a street address; pickup needs a `StockistId`, not an
 * address at all) and a flat optional-everything shape would let
 * invalid combinations (e.g. pickup with a branch number) type-check.
 */
export const DeliveryMethodType = z.enum([
  "novaPoshtaBranch",
  "novaPoshtaCourier",
  "courier",
  "pickup",
]);
export type DeliveryMethodType = z.infer<typeof DeliveryMethodType>;

export const DeliveryMethodSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("novaPoshtaBranch"),
    cityName: z.string().min(1),
    branchNumber: z.string().min(1),
    branchAddress: z.string().optional(),
  }),
  z.object({
    type: z.literal("novaPoshtaCourier"),
    cityName: z.string().min(1),
    address: z.string().min(1),
  }),
  z.object({
    type: z.literal("courier"),
    cityName: z.string().min(1),
    address: z.string().min(1),
  }),
  z.object({
    type: z.literal("pickup"),
    stockistId: StockistId,
  }),
]);
export type DeliveryMethod = Readonly<z.infer<typeof DeliveryMethodSchema>>;

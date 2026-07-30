import { z } from "zod";
import { StockistId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";

/** `Stockist` (Prompt 8 §2.2) — a physical dealer/showroom location for the `/stockists` page. */
export const StockistSchema = z.object({
  id: StockistId,
  name: z.string().min(1),
  city: LocaleContentSchema,
  address: LocaleContentSchema,
  phone: z.string().optional(),
  website: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type Stockist = Readonly<z.infer<typeof StockistSchema>>;

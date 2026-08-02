import { z } from "zod";
import { PhoneNumber } from "../shared/phone";
import { leadCommonFields } from "./lead-common";

/** `DesignerRequest` (Prompt 8 §12) — the designer/trade-partner program signup form (also covers the "dealer" inquiry per §0, since both are a B2B-partnership lead differing only by `companyName`/`portfolioUrl` being relevant). */
export const DesignerRequestSchema = z.object({
  ...leadCommonFields,
  type: z.literal("designer"),
  name: z.string().min(1),
  phone: PhoneNumber,
  email: z.string().email(),
  companyName: z.string().optional(),
  portfolioUrl: z.string().optional(),
  message: z.string().optional(),
});
export type DesignerRequest = Readonly<z.infer<typeof DesignerRequestSchema>>;

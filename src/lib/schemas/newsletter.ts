import { z } from "zod";

/** Shared between the footer newsletter form and its mock API route. */
export const NewsletterSubscribeSchema = z.object({
  email: z.string().trim().min(1).email(),
});
export type NewsletterSubscribeInput = z.infer<
  typeof NewsletterSubscribeSchema
>;

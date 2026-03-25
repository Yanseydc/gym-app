import { z } from "zod";

export const paymentMethodSchema = z.enum(["cash", "transfer", "card"]);

export const paymentFormSchema = z.object({
  clientId: z.string().uuid("Select a valid client."),
  clientMembershipId: z.string().uuid("Select a valid membership."),
  amount: z.coerce.number().positive("Amount must be greater than 0.").max(999999),
  paymentMethod: paymentMethodSchema,
  paymentDate: z.string().min(1, "Payment date is required."),
  concept: z.string().trim().min(1, "Concept is required.").max(160),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

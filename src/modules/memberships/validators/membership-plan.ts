import { z } from "zod";

export const membershipPlanFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  durationInDays: z.coerce
    .number()
    .int("Duration must be a whole number.")
    .min(1, "Duration must be at least 1 day.")
    .max(3650, "Duration is too large."),
  price: z.coerce.number().min(0, "Price must be 0 or more.").max(999999),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((value) => value === true || value === "true"),
});

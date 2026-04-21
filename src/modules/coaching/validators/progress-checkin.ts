import { z } from "zod";

export const progressCheckInFormSchema = z.object({
  checkinDate: z.string().trim().min(1, "Check-in date is required."),
  weightKg: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || Number(value) > 0, {
      message: "Weight must be greater than 0.",
    })
    .refine((value) => !value || Number(value) <= 999.99, {
      message: "Weight is too large.",
    }),
  clientNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  coachNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

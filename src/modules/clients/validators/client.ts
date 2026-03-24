import { z } from "zod";

export const clientStatusSchema = z.enum(["active", "inactive"]);

export const clientFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  phone: z.string().trim().min(1, "Phone is required.").max(40),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Email must be valid.",
    }),
  status: clientStatusSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const clientSearchSchema = z.object({
  search: z.string().trim().max(120).optional().catch(""),
});

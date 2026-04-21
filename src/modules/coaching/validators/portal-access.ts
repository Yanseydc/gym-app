import { z } from "zod";

export const portalAccessFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Email must be valid."),
});

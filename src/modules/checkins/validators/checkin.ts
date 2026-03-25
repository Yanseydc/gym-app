import { z } from "zod";

export const checkInFormSchema = z.object({
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const checkInSearchSchema = z.object({
  search: z.string().trim().max(120).optional().catch(""),
});

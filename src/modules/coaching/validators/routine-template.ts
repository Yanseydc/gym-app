import { z } from "zod";

export const routineTemplateFormSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  notes: z.string().trim().max(2000, "Notes must be 2000 characters or fewer.").optional(),
});

export const routineTemplateApplyFormSchema = z.object({
  clientId: z.string().uuid("Select a valid client."),
});

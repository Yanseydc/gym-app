import { z } from "zod";

const optionalTextField = z.string().trim().max(300).optional().or(z.literal(""));

export const exerciseMediaFormSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required.").max(500).url("Please enter a valid URL."),
  sortOrder: z.coerce
    .number({ invalid_type_error: "Sort order is required." })
    .int("Sort order must be a whole number.")
    .positive("Sort order must be greater than 0."),
  altText: optionalTextField,
});

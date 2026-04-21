import { z } from "zod";

const optionalTextField = z.string().trim().max(2000).optional().or(z.literal(""));

const optionalUrlField = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || z.string().url().safeParse(value).success, {
    message: "Please enter a valid URL.",
  });

export const exerciseDifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only."),
  description: optionalTextField,
  videoUrl: optionalUrlField,
  thumbnailUrl: optionalUrlField,
  primaryMuscle: z.string().trim().max(120).optional().or(z.literal("")),
  secondaryMuscle: z.string().trim().max(120).optional().or(z.literal("")),
  equipment: z.string().trim().max(120).optional().or(z.literal("")),
  difficulty: z.union([exerciseDifficultySchema, z.literal("")]),
  instructions: optionalTextField,
  coachTips: optionalTextField,
  commonMistakes: optionalTextField,
  isActive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((value) => value === true || value === "true"),
});

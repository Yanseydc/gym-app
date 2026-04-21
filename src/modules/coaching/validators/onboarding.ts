import { z } from "zod";

export const onboardingExperienceLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

export const onboardingFormSchema = z.object({
  weightKg: z.coerce
    .number()
    .positive("Weight must be greater than 0.")
    .max(999.99, "Weight is too large."),
  heightCm: z.coerce
    .number()
    .int("Height must be a whole number.")
    .positive("Height must be greater than 0.")
    .max(300, "Height is too large."),
  goal: z.string().trim().min(1, "Goal is required.").max(500),
  availableDays: z.coerce
    .number()
    .int("Available days must be a whole number.")
    .min(1, "Available days must be at least 1.")
    .max(7, "Available days cannot be more than 7."),
  availableSchedule: z
    .string()
    .trim()
    .min(1, "Available schedule is required.")
    .max(500),
  injuriesNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  experienceLevel: onboardingExperienceLevelSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

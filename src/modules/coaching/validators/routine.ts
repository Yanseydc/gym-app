import { z } from "zod";

export const routineStatusSchema = z.enum(["draft", "active", "archived"]);

const optionalTextField = z.string().trim().max(2000).optional().or(z.literal(""));

export const routineFormSchema = z
  .object({
    clientId: z.string().uuid("Please select a client."),
    title: z.string().trim().min(1, "Title is required.").max(120),
    notes: optionalTextField,
    status: routineStatusSchema,
    startsOn: z.string().trim().optional().or(z.literal("")),
    endsOn: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (value) => !value.startsOn || !value.endsOn || value.endsOn >= value.startsOn,
    {
      message: "End date must be on or after start date.",
      path: ["endsOn"],
    },
  );

export const routineDayFormSchema = z.object({
  dayIndex: z.coerce
    .number()
    .int("Day order must be a whole number.")
    .min(1, "Day order must be at least 1.")
    .max(30, "Day order is too large."),
  title: z.string().trim().min(1, "Title is required.").max(120),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const routineExerciseFormSchema = z.object({
  exerciseId: z.string().uuid("Please select an exercise."),
  sortOrder: z.coerce
    .number()
    .int("Sort order must be a whole number.")
    .min(1, "Sort order must be at least 1.")
    .max(500, "Sort order is too large."),
  setsText: z.string().trim().min(1, "Sets are required.").max(80),
  repsText: z.string().trim().min(1, "Reps are required.").max(80),
  targetWeightText: z.string().trim().max(80).optional().or(z.literal("")),
  restSeconds: z
    .union([z.literal(""), z.coerce.number().min(0, "Rest must be zero or greater.")])
    .transform((value) => (value === "" ? "" : String(value))),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

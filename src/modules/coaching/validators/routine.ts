import { z } from "zod";

import {
  REST_SECONDS_MAX,
  REST_SECONDS_NEGATIVE_MESSAGE,
  REST_SECONDS_NOT_INTEGER_MESSAGE,
  REST_SECONDS_TOO_LARGE_MESSAGE,
} from "@/modules/coaching/utils/rest-time";

export const routineStatusSchema = z.enum(["draft", "active", "archived"]);

const optionalTextField = z.string().trim().max(2000).optional().or(z.literal(""));

const restSecondsFieldSchema = z
  .union([
    z.literal(""),
    z.coerce
      .number()
      .int(REST_SECONDS_NOT_INTEGER_MESSAGE)
      .min(0, REST_SECONDS_NEGATIVE_MESSAGE)
      .max(REST_SECONDS_MAX, REST_SECONDS_TOO_LARGE_MESSAGE),
  ])
  .transform((value) => (value === "" ? "" : String(value)));

const routineFormBaseSchema = z
  .object({
    clientId: z.string().uuid("Please select a client."),
    title: z.string().trim().min(1, "Title is required.").max(120),
    notes: optionalTextField,
    status: routineStatusSchema,
    startsOn: z.string().trim().optional().or(z.literal("")),
    endsOn: z.string().trim().optional().or(z.literal("")),
  });

// No "status" field at all (not merely restricted to draft/archived):
// Entrega A0's adversarial review found that even an enum restricted to
// draft/archived still let a crafted request archive a routine through the
// generic save, or drop straight back from active to draft with no
// dedicated confirmation. Status is never part of this schema's input --
// routine-form.tsx renders it as a read-only badge, never a submittable
// control, and update-routine.ts/create-routine.ts/
// create-routine-from-text.ts always compute status themselves
// server-side (preserve the current value on edit, force "draft" on
// create) regardless of what a request body contains. Zod silently strips
// unrecognized keys by default, so even a manually-added "status" field in
// a crafted POST has no effect here.
const routineDraftFormBaseSchema = routineFormBaseSchema.omit({ status: true });

function validateDateRange<T extends { startsOn?: string; endsOn?: string }>(value: T) {
  return !value.startsOn || !value.endsOn || value.endsOn >= value.startsOn;
}

export const routineFormSchema = routineFormBaseSchema.refine(validateDateRange, {
  message: "End date must be on or after start date.",
  path: ["endsOn"],
});

// Used exclusively by the generic "save draft" action (updateRoutine) --
// has no "status" key at all, so a crafted request can't reach any status
// transition through this path.
export const routineDraftFormSchema = routineDraftFormBaseSchema.refine(validateDateRange, {
  message: "End date must be on or after start date.",
  path: ["endsOn"],
});

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
  restSeconds: restSecondsFieldSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

// Same draft-only restriction as routineDraftFormSchema, and for the same
// reason: importing text must never be able to activate a routine as a side
// effect either (Entrega A0 #3 applies uniformly to every routine-creation
// entry point, not just the manual builder).
export const routineTextImportSchema = routineDraftFormBaseSchema
  .extend({
    days: z
      .array(
        z.object({
          dayIndex: z.coerce
            .number()
            .int("Day order must be a whole number.")
            .min(1, "Day order must be at least 1.")
            .max(30, "Day order is too large."),
          title: z.string().trim().min(1, "Title is required.").max(120),
          exercises: z
            .array(
              z.object({
                exerciseName: z.string().trim().min(1, "Exercise name is required.").max(160),
                exerciseId: z.string().uuid("Please select an exercise."),
                setsText: z.string().trim().min(1, "Sets are required.").max(80),
                repsText: z.string().trim().min(1, "Reps are required.").max(80),
                restSeconds: restSecondsFieldSchema,
                notes: z.string().trim().max(1000).optional().or(z.literal("")),
              }),
            )
            .min(1, "Each day needs at least one exercise."),
        }),
      )
      .min(1, "Add at least one day."),
  })
  .refine(validateDateRange, {
    message: "End date must be on or after start date.",
    path: ["endsOn"],
  });

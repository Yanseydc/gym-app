"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { updateRoutineExerciseRecord } from "@/modules/coaching/services/routine-service";
import type {
  RoutineExerciseFormValues,
  RoutineExerciseMutationState,
} from "@/modules/coaching/types";
import { routineExerciseFormSchema } from "@/modules/coaching/validators/routine";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    routineExerciseId: formData.get("routineExerciseId"),
    exerciseId: formData.get("exerciseId"),
    sortOrder: formData.get("sortOrder"),
    setsText: formData.get("setsText"),
    repsText: formData.get("repsText"),
    targetWeightText: formData.get("targetWeightText"),
    restSeconds: formData.get("restSeconds") ?? "",
    notes: formData.get("notes"),
  };
}

function toRoutineExerciseFormValues(
  values: ReturnType<typeof routineExerciseFormSchema.parse>,
): RoutineExerciseFormValues {
  return {
    exerciseId: values.exerciseId,
    sortOrder: values.sortOrder,
    setsText: values.setsText,
    repsText: values.repsText,
    targetWeightText: values.targetWeightText ?? "",
    restSeconds: values.restSeconds,
    notes: values.notes ?? "",
  };
}

export async function updateRoutineExercise(
  routineId: string,
  _prevState: RoutineExerciseMutationState,
  formData: FormData,
): Promise<RoutineExerciseMutationState> {
  const parsed = routineExerciseFormSchema.safeParse(getFieldValues(formData));
  const routineExerciseId = formData.get("routineExerciseId");

  if (typeof routineExerciseId !== "string" || !routineExerciseId) {
    return {
      error: "Unable to identify the routine exercise.",
      fieldErrors: {},
    };
  }

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { error } = await updateRoutineExerciseRecord(
    supabase,
    routineExerciseId,
    toRoutineExerciseFormValues(parsed.data),
  );

  if (error) {
    return {
      error: error.message ?? "Unable to update routine exercise.",
    };
  }

  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);

  return {
    error: undefined,
    fieldErrors: {},
  };
}

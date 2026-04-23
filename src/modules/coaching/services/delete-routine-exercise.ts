"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { deleteRoutineExerciseRecord } from "@/modules/coaching/services/routine-service";

export async function deleteRoutineExercise(
  routineId: string,
  formData: FormData,
) {
  const routineExerciseId = formData.get("routineExerciseId");

  if (typeof routineExerciseId !== "string" || !routineExerciseId) {
    throw new Error("Unable to identify the routine exercise.");
  }

  const supabase = await createSupabaseClient();
  const { error } = await deleteRoutineExerciseRecord(supabase, routineExerciseId);

  if (error) {
    throw new Error(error.message ?? "Unable to delete routine exercise.");
  }

  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);
}

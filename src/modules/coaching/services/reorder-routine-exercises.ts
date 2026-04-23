"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { reorderRoutineExercisesRecord } from "@/modules/coaching/services/routine-service";

export async function reorderRoutineExercises(
  routineId: string,
  routineDayId: string,
  exerciseIds: string[],
) {
  const supabase = await createSupabaseClient();
  const { error } = await reorderRoutineExercisesRecord(supabase, routineDayId, exerciseIds);

  if (error) {
    return {
      error: error.message ?? "Unable to reorder routine exercises.",
    };
  }

  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);

  return {
    error: null,
  };
}

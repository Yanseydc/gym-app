"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { deactivateExerciseRecord } from "@/modules/coaching/services/exercise-service";

export async function deactivateExercise(exerciseId: string) {
  const supabase = await createSupabaseClient();
  const { error } = await deactivateExerciseRecord(supabase, exerciseId);

  if (error) {
    throw new Error(error);
  }

  revalidatePath("/dashboard/coaching/exercises");
}

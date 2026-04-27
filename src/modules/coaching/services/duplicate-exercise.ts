"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { duplicateExerciseRecord } from "@/modules/coaching/services/exercise-service";

export async function duplicateExercise(exerciseId: string) {
  const supabase = await createSupabaseClient();
  const { data, error } = await duplicateExerciseRecord(supabase, exerciseId);

  if (error || !data) {
    throw new Error(typeof error === "string" ? error : error?.message ?? "Unable to duplicate exercise.");
  }

  revalidatePath("/dashboard/coaching/exercises");
  redirect(`/dashboard/coaching/exercises/${data.id}/edit`);
}

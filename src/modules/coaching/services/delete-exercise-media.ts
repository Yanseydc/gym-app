"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { deleteExerciseMediaRecord } from "@/modules/coaching/services/exercise-media-service";

export async function deleteExerciseMedia(exerciseId: string, formData: FormData) {
  const mediaId = formData.get("mediaId");

  if (typeof mediaId !== "string" || !mediaId) {
    throw new Error("Media id is required.");
  }

  const supabase = await createSupabaseClient();
  const { error } = await deleteExerciseMediaRecord(supabase, mediaId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/coaching/exercises/${exerciseId}/edit`);
  revalidatePath("/app/routine");
  redirect(`/dashboard/coaching/exercises/${exerciseId}/edit`);
}

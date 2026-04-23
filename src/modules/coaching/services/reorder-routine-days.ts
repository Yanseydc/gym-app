"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { reorderRoutineDaysRecord } from "@/modules/coaching/services/routine-service";

export async function reorderRoutineDays(
  routineId: string,
  dayIds: string[],
) {
  const supabase = await createSupabaseClient();
  const { error } = await reorderRoutineDaysRecord(supabase, routineId, dayIds);

  if (error) {
    return {
      error: error.message ?? "Unable to reorder routine days.",
    };
  }

  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);

  return {
    error: null,
  };
}

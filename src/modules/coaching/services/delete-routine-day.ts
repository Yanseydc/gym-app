"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { deleteRoutineDayRecord } from "@/modules/coaching/services/routine-service";

export async function deleteRoutineDay(
  routineId: string,
  formData: FormData,
) {
  const routineDayId = formData.get("routineDayId");

  if (typeof routineDayId !== "string" || !routineDayId) {
    throw new Error("Unable to identify the routine day.");
  }

  const supabase = await createSupabaseClient();
  const { error } = await deleteRoutineDayRecord(supabase, routineDayId);

  if (error) {
    throw new Error(error.message ?? "Unable to delete routine day.");
  }

  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);
}

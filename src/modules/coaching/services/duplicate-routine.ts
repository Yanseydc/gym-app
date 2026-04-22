"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { duplicateRoutineRecord, getRoutineById } from "@/modules/coaching/services/routine-service";

export async function duplicateRoutine(routineId: string, returnPath: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseClient();
  const { data: sourceRoutine, error: sourceRoutineError } = await getRoutineById(supabase, routineId);

  if (sourceRoutineError || !sourceRoutine) {
    redirect(returnPath);
  }

  const { data: duplicatedRoutine, error: duplicateError } = await duplicateRoutineRecord(
    supabase,
    user.id,
    sourceRoutine,
  );

  if (duplicateError || !duplicatedRoutine) {
    redirect(returnPath);
  }

  revalidatePath(`/dashboard/clients/${sourceRoutine.clientId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);
  revalidatePath(returnPath);
  redirect(`/dashboard/coaching/routines/${duplicatedRoutine.id}/edit`);
}

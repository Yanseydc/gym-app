"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { getRoutineById, updateRoutineRecord } from "@/modules/coaching/services/routine-service";

export async function archiveRoutine(routineId: string, returnPath: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseClient();
  const { data: routine, error: routineError } = await getRoutineById(supabase, routineId);

  if (routineError || !routine || routine.status === "archived") {
    redirect(returnPath);
  }

  const { error: updateError } = await updateRoutineRecord(supabase, routineId, {
    clientId: routine.clientId,
    title: routine.title,
    notes: routine.notes ?? "",
    status: "archived",
    startsOn: routine.startsOn ?? "",
    endsOn: routine.endsOn ?? "",
  });

  if (updateError) {
    redirect(returnPath);
  }

  revalidatePath(`/dashboard/clients/${routine.clientId}`);
  revalidatePath(`/dashboard/clients/${routine.clientId}?tab=overview`);
  revalidatePath(`/dashboard/clients/${routine.clientId}?tab=coaching`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

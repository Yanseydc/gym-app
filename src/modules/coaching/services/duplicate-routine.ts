"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { duplicateRoutineRecord, getRoutineById } from "@/modules/coaching/services/routine-service";

export type DuplicateRoutineResult =
  | { ok: true; newRoutineId: string }
  | { ok: false; errorKey: "generic" };

// Returns a result instead of redirecting internally -- the caller (client
// component) shows a toast and then navigates itself, so both "toast of
// success" and "clearly reveal the created copy" (Entrega A0 #4) actually
// happen, instead of a bare redirect that silently swallowed errors.
export async function duplicateRoutine(routineId: string): Promise<DuplicateRoutineResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, errorKey: "generic" };
  }

  const supabase = await createSupabaseClient();
  const { data: sourceRoutine, error: sourceRoutineError } = await getRoutineById(supabase, routineId);

  if (sourceRoutineError || !sourceRoutine) {
    return { ok: false, errorKey: "generic" };
  }

  const { data: duplicatedRoutine, error: duplicateError } = await duplicateRoutineRecord(
    supabase,
    user.id,
    sourceRoutine,
  );

  if (duplicateError || !duplicatedRoutine) {
    return { ok: false, errorKey: "generic" };
  }

  revalidatePath(`/dashboard/clients/${sourceRoutine.clientId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);

  return { ok: true, newRoutineId: duplicatedRoutine.id };
}

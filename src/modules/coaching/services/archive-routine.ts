"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { archiveRoutineRecord, getRoutineById } from "@/modules/coaching/services/routine-service";

export type ArchiveRoutineResult =
  | { ok: true; alreadyArchived: boolean }
  | { ok: false; errorKey: ArchiveRoutineErrorKey };

export type ArchiveRoutineErrorKey = "notFound" | "notAuthorized" | "generic";

// Exact substrings archive_client_routine can raise (the RPC body in
// supabase/migrations/20260804130000_...) mapped to a stable, localizable
// key -- mirrors classifyActivationError in activate-routine.ts. Anything
// unrecognized -> "generic", so a raw Postgres/internal message never
// reaches the UI.
function classifyArchiveError(rawMessage: string | null | undefined): ArchiveRoutineErrorKey {
  if (!rawMessage) {
    return "generic";
  }

  if (rawMessage.includes("Routine not found")) {
    return "notFound";
  }

  if (rawMessage.includes("Not authorized")) {
    return "notAuthorized";
  }

  return "generic";
}

// Thin wrapper: archiving is exclusively the archive_client_routine RPC
// (Entrega A0 adversarial review, area 1) -- authorization (re-derived
// from the routine's own gym_id and auth.uid(), never a client-submitted
// value), idempotency (archiving an already-archived routine succeeds
// instead of erroring), and the actual UPDATE all live inside that
// SECURITY DEFINER function, never reimplemented here. This is no longer a
// generic column UPDATE a direct PostgREST request could imitate.
export async function archiveRoutine(routineId: string): Promise<ArchiveRoutineResult> {
  const supabase = await createSupabaseClient();
  const { data, error } = await archiveRoutineRecord(supabase, routineId);

  if (error || !data) {
    return { ok: false, errorKey: classifyArchiveError(error) };
  }

  // Best-effort only -- the RPC above is the sole authority for whether
  // archiving succeeded; this read just resolves the client id so the
  // client's routines list can be revalidated too.
  const { data: routine } = await getRoutineById(supabase, routineId);
  if (routine) {
    revalidatePath(`/dashboard/clients/${routine.clientId}`);
  }
  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);

  return { ok: true, alreadyArchived: data.alreadyArchived };
}

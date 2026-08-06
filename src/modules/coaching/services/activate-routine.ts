"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { activateRoutineRecord, getRoutineById } from "@/modules/coaching/services/routine-service";

export type ActivateRoutineResult =
  | { ok: true; archivedPrevious: boolean }
  | { ok: false; errorKey: ActivateRoutineErrorKey };

export type ActivateRoutineErrorKey =
  | "notFound"
  | "notAuthorized"
  | "conflict"
  | "archived"
  | "generic";

// Exact substrings activateRoutineRecord/the activate_client_routine RPC can
// return (routine-service.ts, and the RPC body in
// supabase/migrations/20260806090000_harden_activate_client_routine_status_guard.sql)
// mapped to a stable, localizable key. Anything unrecognized -> "generic",
// so a raw Postgres/internal message never reaches the UI (Entrega A0 #3/#4,
// re-verified for the archived-is-terminal guard in Entrega A0.3).
function classifyActivationError(rawMessage: string | null | undefined, code?: string | null): ActivateRoutineErrorKey {
  if (code === "23505") {
    return "conflict";
  }

  if (!rawMessage) {
    return "generic";
  }

  if (rawMessage.includes("client_routines_one_active_per_client_idx")) {
    return "conflict";
  }

  if (rawMessage.includes("Archived routines cannot be reactivated")) {
    return "archived";
  }

  if (
    rawMessage.includes("Routine is not available") ||
    rawMessage.includes("Selected client is not available") ||
    rawMessage.includes("not found")
  ) {
    return "notFound";
  }

  if (rawMessage.includes("Not authorized") || rawMessage.includes("not authorized")) {
    return "notAuthorized";
  }

  return "generic";
}

// Thin wrapper: the only business logic here is fetching the routine to
// call activateRoutineRecord with its own current field values (title,
// notes, dates, clientId) unchanged, since activate_client_routine expects
// them as parameters. The actual activation/auto-archive-previous logic
// lives entirely in that RPC (supabase/migrations/20260803120000_...) and
// is never reimplemented here.
export async function activateRoutine(routineId: string): Promise<ActivateRoutineResult> {
  const supabase = await createSupabaseClient();
  const { data: routine, error: routineError } = await getRoutineById(supabase, routineId);

  if (routineError || !routine) {
    return { ok: false, errorKey: "notFound" };
  }

  const { data, error, code } = await activateRoutineRecord(supabase, routineId, {
    clientId: routine.clientId,
    title: routine.title,
    notes: routine.notes ?? "",
    status: "active",
    startsOn: routine.startsOn ?? "",
    endsOn: routine.endsOn ?? "",
  });

  if (error || !data) {
    return { ok: false, errorKey: classifyActivationError(error, code) };
  }

  revalidatePath(`/dashboard/clients/${routine.clientId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);

  return { ok: true, archivedPrevious: data.archivedPrevious };
}

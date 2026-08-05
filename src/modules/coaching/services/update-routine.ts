"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getRoutineById, updateRoutineRecord } from "@/modules/coaching/services/routine-service";
import type { ClientRoutineStatus, RoutineFormValues, RoutineMutationState } from "@/modules/coaching/types";
import { routineDraftFormSchema } from "@/modules/coaching/validators/routine";

// "status" is never read from formData at all -- not even to validate and
// reject it. There is no field here a crafted request could populate to
// influence status; toRoutineFormValues below always uses the freshly
// fetched, currently-persisted status instead (Entrega A0 adversarial
// review, area 1).
function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  };
}

function toRoutineFormValues(
  values: ReturnType<typeof routineDraftFormSchema.parse>,
  currentStatus: ClientRoutineStatus,
): RoutineFormValues {
  return {
    clientId: values.clientId,
    title: values.title,
    notes: values.notes ?? "",
    // Saving metadata NEVER changes status, unconditionally -- regardless
    // of the routine's current status (draft, active, or archived) and
    // regardless of anything a crafted request might submit. The only two
    // actions that can ever change status are the dedicated Activate/
    // Archive actions (activate-routine.ts / archive-routine.ts).
    status: currentStatus,
    startsOn: values.startsOn ?? "",
    endsOn: values.endsOn ?? "",
  };
}

// Draft-only save: activation is a separate action, see activate-routine.ts,
// which reuses activateRoutineRecord (the same activate_client_routine RPC
// wrapper) behind its own confirmation. This action never calls that RPC.
export async function updateRoutine(
  routineId: string,
  _prevState: RoutineMutationState,
  formData: FormData,
): Promise<RoutineMutationState> {
  const parsed = routineDraftFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data: currentRoutine, error: currentRoutineError } = await getRoutineById(supabase, routineId);

  if (currentRoutineError || !currentRoutine) {
    return {
      error: currentRoutineError ?? "Routine is not available.",
    };
  }

  const values = toRoutineFormValues(parsed.data, currentRoutine.status);
  const { data: updatedRoutine, error } = await updateRoutineRecord(supabase, routineId, values);

  if (error || !updatedRoutine) {
    return {
      error: error?.message ?? "Unable to update routine.",
    };
  }

  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);
  redirect(`/dashboard/coaching/routines/${updatedRoutine.id}/edit`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { activateRoutineRecord, updateRoutineRecord } from "@/modules/coaching/services/routine-service";
import type { RoutineFormValues, RoutineMutationState } from "@/modules/coaching/types";
import { routineFormSchema } from "@/modules/coaching/validators/routine";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    status: formData.get("status"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  };
}

function toRoutineFormValues(
  values: ReturnType<typeof routineFormSchema.parse>,
): RoutineFormValues {
  return {
    clientId: values.clientId,
    title: values.title,
    notes: values.notes ?? "",
    status: values.status,
    startsOn: values.startsOn ?? "",
    endsOn: values.endsOn ?? "",
  };
}

export async function updateRoutine(
  routineId: string,
  _prevState: RoutineMutationState,
  formData: FormData,
): Promise<RoutineMutationState> {
  const parsed = routineFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const values = toRoutineFormValues(parsed.data);
  let data: { archivedPrevious?: boolean; id: string } | null = null;

  if (values.status === "active") {
    const { data: activationData, error, code } = await activateRoutineRecord(
      supabase,
      routineId,
      values,
    );

    if (error || !activationData) {
      return {
        error:
          code === "23505" || error?.includes("client_routines_one_active_per_client_idx")
            ? "This client already has an active routine. Try again or review the current routine."
            : error ?? "Unable to update routine.",
      };
    }

    data = activationData;
  } else {
    const { data: updatedRoutine, error } = await updateRoutineRecord(supabase, routineId, values);

    if (error || !updatedRoutine) {
      return {
        error: error?.message ?? "Unable to update routine.",
      };
    }

    data = { id: updatedRoutine.id };
  }

  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);
  redirect(
    `/dashboard/coaching/routines/${data.id}/edit${"archivedPrevious" in data && data.archivedPrevious ? "?notice=archived_previous" : ""}`,
  );
}

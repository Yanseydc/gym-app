"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { activateRoutineRecord, createRoutineRecord } from "@/modules/coaching/services/routine-service";
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

export async function createRoutine(
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

  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "You must be signed in to create a routine.",
    };
  }

  const supabase = await createSupabaseClient();
  const values = toRoutineFormValues(parsed.data);
  const { data: createdRoutine, error: createError } = await createRoutineRecord(
    supabase,
    user.id,
    {
      ...values,
      status: values.status === "active" ? "draft" : values.status,
    },
  );

  if (createError || !createdRoutine) {
    return {
      error: createError?.message ?? "Unable to create routine.",
    };
  }

  let routineId = createdRoutine.id;
  let archivedPrevious = false;

  if (values.status === "active") {
    const { data: activatedRoutine, error: activationError, code } = await activateRoutineRecord(
      supabase,
      createdRoutine.id,
      values,
    );

    if (activationError || !activatedRoutine) {
      return {
        error:
          code === "23505"
            ? "This client already has an active routine. Try again or review the current routine."
            : activationError?.includes("client_routines_one_active_per_client_idx")
              ? "This client already has an active routine. Try again or review the current routine."
              : activationError ?? "Unable to activate routine.",
      };
    }

    routineId = activatedRoutine.id;
    archivedPrevious = activatedRoutine.archivedPrevious;
  }

  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
  redirect(`/dashboard/coaching/routines/${routineId}/edit${archivedPrevious ? "?notice=archived_previous" : ""}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import {
  activateRoutineRecord,
  createRoutineFromTextRecord,
} from "@/modules/coaching/services/routine-service";
import type {
  RoutineFormValues,
  RoutineTextImportMutationState,
  RoutineTextImportValues,
} from "@/modules/coaching/types";
import { routineTextImportSchema } from "@/modules/coaching/validators/routine";

function getPayload(formData: FormData) {
  const payload = formData.get("payload");

  if (typeof payload !== "string") {
    return null;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
}

function toRoutineFormValues(values: RoutineTextImportValues): RoutineFormValues {
  return {
    clientId: values.clientId,
    title: values.title,
    notes: values.notes,
    status: values.status,
    startsOn: values.startsOn,
    endsOn: values.endsOn,
  };
}

export async function createRoutineFromText(
  _prevState: RoutineTextImportMutationState,
  formData: FormData,
): Promise<RoutineTextImportMutationState> {
  const payload = getPayload(formData);
  const parsed = routineTextImportSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields before importing.",
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

  const values: RoutineTextImportValues = {
    ...parsed.data,
    notes: parsed.data.notes ?? "",
    startsOn: parsed.data.startsOn ?? "",
    endsOn: parsed.data.endsOn ?? "",
    days: parsed.data.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        notes: exercise.notes ?? "",
      })),
    })),
  };

  const supabase = await createSupabaseClient();
  const { data: createdRoutine, error: createError } = await createRoutineFromTextRecord(
    supabase,
    user.id,
    values,
  );

  if (createError || !createdRoutine) {
    return {
      error: createError?.message ?? "Unable to import routine.",
    };
  }

  let routineId = createdRoutine.id;
  let archivedPrevious = false;

  if (values.status === "active") {
    const { data: activatedRoutine, error: activationError, code } = await activateRoutineRecord(
      supabase,
      routineId,
      toRoutineFormValues(values),
    );

    if (activationError || !activatedRoutine) {
      await supabase.from("client_routines").delete().eq("id", routineId);
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

  revalidatePath(`/dashboard/clients/${values.clientId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  redirect(`/dashboard/coaching/routines/${routineId}/edit${archivedPrevious ? "?notice=archived_previous" : ""}`);
}

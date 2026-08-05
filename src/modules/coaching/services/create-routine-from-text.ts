"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { createRoutineFromTextRecord } from "@/modules/coaching/services/routine-service";
import type { RoutineTextImportMutationState, RoutineTextImportValues } from "@/modules/coaching/types";
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

// Imported routines never activate on creation either -- same reasoning as
// create-routine.ts (Entrega A0 #3): a freshly imported routine hasn't been
// reviewed/corrected in the builder yet, so it always lands as a draft
// (or archived, if explicitly chosen) and activation is a separate,
// explicit later step.
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
    // Always "draft", unconditionally -- routineTextImportSchema has no
    // status field at all (Entrega A0 adversarial review, area 1). An
    // imported routine has not been reviewed in the builder yet, so it
    // never starts as anything but a draft.
    status: "draft",
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

  revalidatePath(`/dashboard/clients/${values.clientId}`);
  revalidatePath(`/dashboard/coaching/routines/${createdRoutine.id}`);
  redirect(`/dashboard/coaching/routines/${createdRoutine.id}/edit`);
}

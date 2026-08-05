"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { createRoutineRecord } from "@/modules/coaching/services/routine-service";
import type { RoutineFormValues, RoutineMutationState } from "@/modules/coaching/types";
import { routineDraftFormSchema } from "@/modules/coaching/validators/routine";

// "status" is never read from formData -- routineDraftFormSchema has no
// status field at all (Entrega A0 adversarial review, area 1), and
// toRoutineFormValues below always hardcodes "draft" regardless of what a
// crafted request might submit.
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
): RoutineFormValues {
  return {
    clientId: values.clientId,
    title: values.title,
    notes: values.notes ?? "",
    // A brand-new routine always starts as draft, unconditionally -- never
    // active, never archived (Entrega A0 #3). A database trigger enforces
    // this too (20260804130000_...): an INSERT with status="active" is
    // rejected unless it comes from inside activate_client_routine.
    status: "draft",
    startsOn: values.startsOn ?? "",
    endsOn: values.endsOn ?? "",
  };
}

// Creation never activates: a brand-new routine has no days/exercises yet,
// so activating it immediately would revive the "empty routine goes live"
// gap. Activation is a separate, later action on the routine's own edit
// page (see activate-routine.ts) once the coach has actually built it out.
export async function createRoutine(
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

  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "You must be signed in to create a routine.",
    };
  }

  const supabase = await createSupabaseClient();
  const values = toRoutineFormValues(parsed.data);
  const { data: createdRoutine, error: createError } = await createRoutineRecord(supabase, user.id, values);

  if (createError || !createdRoutine) {
    return {
      error: createError?.message ?? "Unable to create routine.",
    };
  }

  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
  redirect(`/dashboard/coaching/routines/${createdRoutine.id}/edit`);
}

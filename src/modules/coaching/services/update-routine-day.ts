"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { updateRoutineDayRecord } from "@/modules/coaching/services/routine-service";
import type { RoutineDayFormValues, RoutineDayMutationState } from "@/modules/coaching/types";
import { routineDayFormSchema } from "@/modules/coaching/validators/routine";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    routineDayId: formData.get("routineDayId"),
    dayIndex: formData.get("dayIndex"),
    title: formData.get("title"),
    notes: formData.get("notes"),
  };
}

function toRoutineDayFormValues(
  values: ReturnType<typeof routineDayFormSchema.parse>,
): RoutineDayFormValues {
  return {
    dayIndex: values.dayIndex,
    title: values.title,
    notes: values.notes ?? "",
  };
}

export async function updateRoutineDay(
  routineId: string,
  _prevState: RoutineDayMutationState,
  formData: FormData,
): Promise<RoutineDayMutationState> {
  const parsed = routineDayFormSchema.safeParse(getFieldValues(formData));
  const routineDayId = formData.get("routineDayId");

  if (typeof routineDayId !== "string" || !routineDayId) {
    return {
      error: "Unable to identify the routine day.",
      fieldErrors: {},
    };
  }

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { error } = await updateRoutineDayRecord(
    supabase,
    routineDayId,
    toRoutineDayFormValues(parsed.data),
  );

  if (error) {
    return {
      error: error.message ?? "Unable to update routine day.",
    };
  }

  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);

  return {
    error: undefined,
    fieldErrors: {},
  };
}

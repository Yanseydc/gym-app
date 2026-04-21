"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createRoutineDayRecord } from "@/modules/coaching/services/routine-service";
import type { RoutineDayFormValues, RoutineDayMutationState } from "@/modules/coaching/types";
import { routineDayFormSchema } from "@/modules/coaching/validators/routine";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
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

export async function createRoutineDay(
  routineId: string,
  _prevState: RoutineDayMutationState,
  formData: FormData,
): Promise<RoutineDayMutationState> {
  const parsed = routineDayFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { error } = await createRoutineDayRecord(
    supabase,
    routineId,
    toRoutineDayFormValues(parsed.data),
  );

  if (error) {
    return {
      error: error.message ?? "Unable to add routine day.",
    };
  }

  revalidatePath(`/dashboard/coaching/routines/${routineId}`);
  revalidatePath(`/dashboard/coaching/routines/${routineId}/edit`);

  return {
    error: undefined,
    fieldErrors: {},
  };
}

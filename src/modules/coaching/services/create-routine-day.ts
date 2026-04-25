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

async function getNextDayIndex(routineId: string) {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("client_routine_days")
    .select("day_index")
    .eq("client_routine_id", routineId)
    .order("day_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      dayIndex: null,
      error: error.message,
    };
  }

  return {
    dayIndex: (((data as { day_index?: number } | null)?.day_index) ?? 0) + 1,
    error: null,
  };
}

export async function createRoutineDay(
  routineId: string,
  _prevState: RoutineDayMutationState,
  formData: FormData,
): Promise<RoutineDayMutationState> {
  const rawValues = getFieldValues(formData);

  if (!rawValues.dayIndex) {
    const { dayIndex, error } = await getNextDayIndex(routineId);

    if (error || dayIndex == null) {
      return {
        error: error ?? "Unable to determine the next day order.",
        fieldErrors: {},
      };
    }

    rawValues.dayIndex = String(dayIndex);
  }

  const parsed = routineDayFormSchema.safeParse(rawValues);

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await createRoutineDayRecord(
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
    routineDayId: data?.id ? String(data.id) : undefined,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createRoutineTemplateRecord } from "@/modules/coaching/services/routine-template-service";
import { getRoutineById } from "@/modules/coaching/services/routine-service";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import type { RoutineTemplateFormValues, RoutineTemplateMutationState } from "@/modules/coaching/types";
import { routineTemplateFormSchema } from "@/modules/coaching/validators/routine-template";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    title: formData.get("title"),
    notes: formData.get("notes"),
  };
}

function toRoutineTemplateFormValues(
  values: ReturnType<typeof routineTemplateFormSchema.parse>,
): RoutineTemplateFormValues {
  return {
    title: values.title,
    notes: values.notes ?? "",
  };
}

export async function createRoutineTemplate(
  routineId: string,
  returnPath: string,
  _prevState: RoutineTemplateMutationState,
  formData: FormData,
): Promise<RoutineTemplateMutationState> {
  const parsed = routineTemplateFormSchema.safeParse(getFieldValues(formData));

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
      error: "You must be signed in to save a template.",
    };
  }

  const supabase = await createSupabaseClient();
  const { data: sourceRoutine, error: sourceError } = await getRoutineById(supabase, routineId);

  if (sourceError || !sourceRoutine) {
    return {
      error: sourceError ?? "Unable to load the source routine.",
    };
  }

  const { data, error } = await createRoutineTemplateRecord(
    supabase,
    user.id,
    sourceRoutine,
    toRoutineTemplateFormValues(parsed.data),
  );

  if (error || !data) {
    return {
      error: error ?? "Unable to save the template.",
    };
  }

  revalidatePath("/dashboard/coaching/templates");
  revalidatePath(returnPath);
  redirect(`/dashboard/coaching/templates/${data.id}`);
}

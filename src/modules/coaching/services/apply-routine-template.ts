"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { applyRoutineTemplateRecord, getRoutineTemplateById } from "@/modules/coaching/services/routine-template-service";
import type {
  RoutineTemplateApplyFormValues,
  RoutineTemplateApplyMutationState,
} from "@/modules/coaching/types";
import { routineTemplateApplyFormSchema } from "@/modules/coaching/validators/routine-template";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    clientId: formData.get("clientId"),
  };
}

function toApplyFormValues(
  values: ReturnType<typeof routineTemplateApplyFormSchema.parse>,
): RoutineTemplateApplyFormValues {
  return {
    clientId: values.clientId,
  };
}

export async function applyRoutineTemplate(
  templateId: string,
  _prevState: RoutineTemplateApplyMutationState,
  formData: FormData,
): Promise<RoutineTemplateApplyMutationState> {
  const parsed = routineTemplateApplyFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please select a client to apply this template.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "You must be signed in to apply a template.",
    };
  }

  const supabase = await createSupabaseClient();
  const { data: template, error: templateError } = await getRoutineTemplateById(supabase, templateId);

  if (templateError || !template) {
    return {
      error: templateError ?? "Unable to load the selected template.",
    };
  }

  const { data, error } = await applyRoutineTemplateRecord(
    supabase,
    user.id,
    template,
    toApplyFormValues(parsed.data),
  );

  if (error || !data) {
    return {
      error: error ?? "Unable to apply the template.",
    };
  }

  revalidatePath(`/dashboard/coaching/templates/${templateId}`);
  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
  redirect(`/dashboard/coaching/routines/${data.id}/edit`);
}

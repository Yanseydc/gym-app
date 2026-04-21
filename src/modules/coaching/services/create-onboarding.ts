"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createOnboardingRecord } from "@/modules/coaching/services/onboarding-service";
import type {
  ClientOnboardingFormValues,
  ClientOnboardingMutationState,
} from "@/modules/coaching/types";
import { onboardingFormSchema } from "@/modules/coaching/validators/onboarding";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    weightKg: formData.get("weightKg"),
    heightCm: formData.get("heightCm"),
    goal: formData.get("goal"),
    availableDays: formData.get("availableDays"),
    availableSchedule: formData.get("availableSchedule"),
    injuriesNotes: formData.get("injuriesNotes"),
    experienceLevel: formData.get("experienceLevel"),
    notes: formData.get("notes"),
  };
}

function toOnboardingFormValues(
  values: ReturnType<typeof onboardingFormSchema.parse>,
): ClientOnboardingFormValues {
  return {
    weightKg: values.weightKg,
    heightCm: values.heightCm,
    goal: values.goal,
    availableDays: values.availableDays,
    availableSchedule: values.availableSchedule,
    injuriesNotes: values.injuriesNotes ?? "",
    experienceLevel: values.experienceLevel,
    notes: values.notes ?? "",
  };
}

export async function createOnboarding(
  clientId: string,
  _prevState: ClientOnboardingMutationState,
  formData: FormData,
): Promise<ClientOnboardingMutationState> {
  const parsed = onboardingFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await createOnboardingRecord(
    supabase,
    clientId,
    toOnboardingFormValues(parsed.data),
  );

  if (error || !data) {
    return {
      error: error?.message ?? "Unable to create onboarding.",
    };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${clientId}`);
}

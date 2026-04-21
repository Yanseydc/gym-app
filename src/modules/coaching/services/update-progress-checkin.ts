"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  saveProgressCheckInPhotos,
  updateProgressCheckInRecord,
} from "@/modules/coaching/services/progress-checkin-service";
import type {
  ProgressCheckInFormValues,
  ProgressCheckInMutationState,
  ProgressPhotoType,
} from "@/modules/coaching/types";
import { progressCheckInFormSchema } from "@/modules/coaching/validators/progress-checkin";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    checkinDate: formData.get("checkinDate"),
    weightKg: formData.get("weightKg"),
    clientNotes: formData.get("clientNotes"),
    coachNotes: formData.get("coachNotes"),
  };
}

function toProgressCheckInFormValues(
  values: ReturnType<typeof progressCheckInFormSchema.parse>,
): ProgressCheckInFormValues {
  return {
    checkinDate: values.checkinDate,
    weightKg: values.weightKg ?? "",
    clientNotes: values.clientNotes ?? "",
    coachNotes: values.coachNotes ?? "",
  };
}

function getPhotoFiles(formData: FormData): Record<ProgressPhotoType, File | null> {
  return {
    front: formData.get("frontPhoto") instanceof File ? (formData.get("frontPhoto") as File) : null,
    side: formData.get("sidePhoto") instanceof File ? (formData.get("sidePhoto") as File) : null,
    back: formData.get("backPhoto") instanceof File ? (formData.get("backPhoto") as File) : null,
  };
}

export async function updateProgressCheckIn(
  clientId: string,
  checkinId: string,
  _prevState: ProgressCheckInMutationState,
  formData: FormData,
): Promise<ProgressCheckInMutationState> {
  const parsed = progressCheckInFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await updateProgressCheckInRecord(
    supabase,
    checkinId,
    toProgressCheckInFormValues(parsed.data),
  );

  if (error || !data) {
    return {
      error: error?.message ?? "Unable to update progress check-in.",
    };
  }

  const photoResult = await saveProgressCheckInPhotos({
    checkinId,
    clientId,
    files: getPhotoFiles(formData),
    supabase,
  });

  if (photoResult.error) {
    return {
      error: photoResult.error,
    };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${clientId}/progress-checkins/${checkinId}/edit`);
}

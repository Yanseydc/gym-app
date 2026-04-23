"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createExerciseMediaRecord } from "@/modules/coaching/services/exercise-media-service";
import type { ExerciseMediaFormValues, ExerciseMediaMutationState } from "@/modules/coaching/types";
import { exerciseMediaFormSchema } from "@/modules/coaching/validators/exercise-media";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    url: formData.get("url"),
    sortOrder: formData.get("sortOrder"),
    altText: formData.get("altText"),
  };
}

function toExerciseMediaFormValues(
  values: ReturnType<typeof exerciseMediaFormSchema.parse>,
): ExerciseMediaFormValues {
  return {
    url: values.url,
    sortOrder: String(values.sortOrder),
    altText: values.altText ?? "",
  };
}

export async function createExerciseMedia(
  exerciseId: string,
  _prevState: ExerciseMediaMutationState,
  formData: FormData,
): Promise<ExerciseMediaMutationState> {
  const parsed = exerciseMediaFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await createExerciseMediaRecord(
    supabase,
    exerciseId,
    toExerciseMediaFormValues(parsed.data),
  );

  if (error || !data) {
    return {
      error: error?.message ?? "Unable to add gallery image.",
    };
  }

  revalidatePath(`/dashboard/coaching/exercises/${exerciseId}/edit`);
  revalidatePath("/app/routine");
  redirect(`/dashboard/coaching/exercises/${exerciseId}/edit`);
}

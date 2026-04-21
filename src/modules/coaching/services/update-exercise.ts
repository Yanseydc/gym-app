"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { updateExerciseRecord } from "@/modules/coaching/services/exercise-service";
import type { ExerciseFormValues, ExerciseMutationState } from "@/modules/coaching/types";
import { exerciseFormSchema } from "@/modules/coaching/validators/exercise";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    videoUrl: formData.get("videoUrl"),
    thumbnailUrl: formData.get("thumbnailUrl"),
    primaryMuscle: formData.get("primaryMuscle"),
    secondaryMuscle: formData.get("secondaryMuscle"),
    equipment: formData.get("equipment"),
    difficulty: formData.get("difficulty"),
    instructions: formData.get("instructions"),
    coachTips: formData.get("coachTips"),
    commonMistakes: formData.get("commonMistakes"),
    isActive: formData.get("isActive") ?? "false",
  };
}

function toExerciseFormValues(
  values: ReturnType<typeof exerciseFormSchema.parse>,
): ExerciseFormValues {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description ?? "",
    videoUrl: values.videoUrl ?? "",
    thumbnailUrl: values.thumbnailUrl ?? "",
    primaryMuscle: values.primaryMuscle ?? "",
    secondaryMuscle: values.secondaryMuscle ?? "",
    equipment: values.equipment ?? "",
    difficulty: values.difficulty,
    instructions: values.instructions ?? "",
    coachTips: values.coachTips ?? "",
    commonMistakes: values.commonMistakes ?? "",
    isActive: values.isActive,
  };
}

export async function updateExercise(
  exerciseId: string,
  _prevState: ExerciseMutationState,
  formData: FormData,
): Promise<ExerciseMutationState> {
  const parsed = exerciseFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await updateExerciseRecord(
    supabase,
    exerciseId,
    toExerciseFormValues(parsed.data),
  );

  if (error || !data) {
    return {
      error: error?.message ?? "Unable to update exercise.",
    };
  }

  revalidatePath("/dashboard/coaching/exercises");
  revalidatePath(`/dashboard/coaching/exercises/${exerciseId}/edit`);
  redirect(`/dashboard/coaching/exercises/${data.id}/edit`);
}

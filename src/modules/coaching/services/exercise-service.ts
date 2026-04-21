import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ExerciseFormValues,
  ExerciseLibraryItem,
  ExerciseLibraryRecord,
} from "@/modules/coaching/types";

function mapExercise(record: ExerciseLibraryRecord): ExerciseLibraryItem {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    videoUrl: record.video_url,
    thumbnailUrl: record.thumbnail_url,
    primaryMuscle: record.primary_muscle,
    secondaryMuscle: record.secondary_muscle,
    equipment: record.equipment,
    difficulty: record.difficulty,
    instructions: record.instructions,
    coachTips: record.coach_tips,
    commonMistakes: record.common_mistakes,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function normalizeExercisePayload(values: ExerciseFormValues) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description.trim() || null,
    video_url: values.videoUrl.trim() || null,
    thumbnail_url: values.thumbnailUrl.trim() || null,
    primary_muscle: values.primaryMuscle.trim() || null,
    secondary_muscle: values.secondaryMuscle.trim() || null,
    equipment: values.equipment.trim() || null,
    difficulty: values.difficulty || null,
    instructions: values.instructions.trim() || null,
    coach_tips: values.coachTips.trim() || null,
    common_mistakes: values.commonMistakes.trim() || null,
    is_active: values.isActive,
    updated_at: new Date().toISOString(),
  };
}

export async function listExercises(
  supabase: AppSupabaseClient,
): Promise<{ data: ExerciseLibraryItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((exercise) => mapExercise(exercise as ExerciseLibraryRecord)),
    error: null,
  };
}

export async function getExerciseById(
  supabase: AppSupabaseClient,
  exerciseId: string,
): Promise<{ data: ExerciseLibraryItem | null; error: string | null }> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("id", exerciseId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data ? mapExercise(data as ExerciseLibraryRecord) : null,
    error: null,
  };
}

export async function createExerciseRecord(
  supabase: AppSupabaseClient,
  values: ExerciseFormValues,
) {
  return supabase
    .from("exercise_library")
    .insert({
      ...normalizeExercisePayload(values),
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function updateExerciseRecord(
  supabase: AppSupabaseClient,
  exerciseId: string,
  values: ExerciseFormValues,
) {
  return supabase
    .from("exercise_library")
    .update(normalizeExercisePayload(values))
    .eq("id", exerciseId)
    .select("id")
    .single();
}

export const getExercisesForPage = cache(async () => {
  const supabase = await createClient();
  return listExercises(supabase);
});

export const getExerciseForPage = cache(async (exerciseId: string) => {
  const supabase = await createClient();
  return getExerciseById(supabase, exerciseId);
});

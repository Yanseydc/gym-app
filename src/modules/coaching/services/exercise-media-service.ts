import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import { canEditExerciseRecord } from "@/modules/coaching/services/exercise-service";
import type {
  ExerciseMediaFormValues,
  ExerciseMediaItem,
  ExerciseMediaRecord,
} from "@/modules/coaching/types";

function mapExerciseMedia(record: ExerciseMediaRecord): ExerciseMediaItem {
  return {
    id: record.id,
    exerciseId: record.exercise_id,
    url: record.url,
    sortOrder: record.sort_order,
    altText: record.alt_text,
    createdAt: record.created_at,
  };
}

function normalizeExerciseMediaPayload(values: ExerciseMediaFormValues) {
  return {
    url: values.url.trim(),
    sort_order: Number(values.sortOrder),
    alt_text: values.altText.trim() || null,
  };
}

export async function listExerciseMediaByExerciseId(
  supabase: AppSupabaseClient,
  exerciseId: string,
): Promise<{ data: ExerciseMediaItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("exercise_media")
    .select("*")
    .eq("exercise_id", exerciseId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((media) => mapExerciseMedia(media as ExerciseMediaRecord)),
    error: null,
  };
}

export async function createExerciseMediaRecord(
  supabase: AppSupabaseClient,
  exerciseId: string,
  values: ExerciseMediaFormValues,
) {
  const canEdit = await canEditExerciseRecord(supabase, exerciseId);

  if (canEdit.error || !canEdit.data) {
    return { data: null, error: { message: canEdit.error ?? "Exercise gallery is not editable." } };
  }

  return supabase
    .from("exercise_media")
    .insert({
      ...normalizeExerciseMediaPayload(values),
      exercise_id: exerciseId,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function updateExerciseMediaRecord(
  supabase: AppSupabaseClient,
  mediaId: string,
  values: ExerciseMediaFormValues,
) {
  const { data: media, error: mediaError } = await supabase
    .from("exercise_media")
    .select("exercise_id")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaError) {
    return { data: null, error: { message: mediaError.message } };
  }

  if (!media) {
    return { data: null, error: { message: "Gallery image not found." } };
  }

  const canEdit = await canEditExerciseRecord(supabase, String(media.exercise_id));

  if (canEdit.error || !canEdit.data) {
    return { data: null, error: { message: canEdit.error ?? "Exercise gallery is not editable." } };
  }

  return supabase
    .from("exercise_media")
    .update(normalizeExerciseMediaPayload(values))
    .eq("id", mediaId)
    .select("id")
    .single();
}

export async function deleteExerciseMediaRecord(
  supabase: AppSupabaseClient,
  mediaId: string,
) {
  const { data: media, error: mediaError } = await supabase
    .from("exercise_media")
    .select("exercise_id")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaError) {
    return { data: null, error: { message: mediaError.message } };
  }

  if (!media) {
    return { data: null, error: { message: "Gallery image not found." } };
  }

  const canEdit = await canEditExerciseRecord(supabase, String(media.exercise_id));

  if (canEdit.error || !canEdit.data) {
    return { data: null, error: { message: canEdit.error ?? "Exercise gallery is not editable." } };
  }

  return supabase.from("exercise_media").delete().eq("id", mediaId);
}

export const getExerciseMediaForPage = cache(async (exerciseId: string) => {
  const supabase = await createClient();
  return listExerciseMediaByExerciseId(supabase, exerciseId);
});

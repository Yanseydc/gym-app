import { cache } from "react";

import { canManageGymContent, requireGymScope, type GymScope } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ExerciseFormValues,
  ExerciseLibraryItem,
  ExerciseLibraryRecord,
} from "@/modules/coaching/types";

function mapExercise(record: ExerciseLibraryRecord, scope: GymScope): ExerciseLibraryItem {
  const source = record.gym_id ? "gym" : "system";
  const canEdit = scope.isSuperAdmin || (canManageGymContent(scope) && record.gym_id === scope.gymId);
  const canDeactivate = source === "gym" && canEdit && record.is_active;

  return {
    id: record.id,
    gymId: record.gym_id,
    createdBy: record.created_by,
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
    source,
    canEdit,
    canDuplicate: source === "system" && !scope.isSuperAdmin && canManageGymContent(scope),
    canDeactivate,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function buildDuplicateName(baseName: string, existingNames: Set<string>) {
  const cleanBaseName = `${baseName} personalizado`;

  if (!existingNames.has(cleanBaseName.toLowerCase())) {
    return cleanBaseName;
  }

  let suffix = 2;
  let nextName = `${cleanBaseName} ${suffix}`;

  while (existingNames.has(nextName.toLowerCase())) {
    suffix += 1;
    nextName = `${cleanBaseName} ${suffix}`;
  }

  return nextName;
}

function buildDuplicateSlug(baseSlug: string, existingSlugs: Set<string>) {
  const cleanBaseSlug = `${baseSlug}-personalizado`;

  if (!existingSlugs.has(cleanBaseSlug)) {
    return cleanBaseSlug;
  }

  let suffix = 2;
  let nextSlug = `${cleanBaseSlug}-${suffix}`;

  while (existingSlugs.has(nextSlug)) {
    suffix += 1;
    nextSlug = `${cleanBaseSlug}-${suffix}`;
  }

  return nextSlug;
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
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("exercise_library")
    .select("*")
    .order("name", { ascending: true });

  if (!scope.isSuperAdmin) {
    query = query.or(`gym_id.is.null,gym_id.eq.${scope.gymId}`);
  }

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((exercise) => mapExercise(exercise as ExerciseLibraryRecord, scope)),
    error: null,
  };
}

export async function getExerciseById(
  supabase: AppSupabaseClient,
  exerciseId: string,
): Promise<{ data: ExerciseLibraryItem | null; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError };
  }

  let query = supabase
    .from("exercise_library")
    .select("*")
    .eq("id", exerciseId);

  if (!scope.isSuperAdmin) {
    query = query.or(`gym_id.is.null,gym_id.eq.${scope.gymId}`);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data ? mapExercise(data as ExerciseLibraryRecord, scope) : null,
    error: null,
  };
}

export async function createExerciseRecord(
  supabase: AppSupabaseClient,
  values: ExerciseFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  if (!canManageGymContent(scope)) {
    return { data: null, error: { message: "You do not have permission to create exercises." } };
  }

  return supabase
    .from("exercise_library")
    .insert({
      ...normalizeExercisePayload(values),
      gym_id: scope.isSuperAdmin ? null : scope.gymId,
      created_by: scope.id,
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
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let lookupQuery = supabase
    .from("exercise_library")
    .select("id, gym_id")
    .eq("id", exerciseId);

  if (!scope.isSuperAdmin) {
    lookupQuery = lookupQuery.eq("gym_id", scope.gymId ?? "");
  }

  const { data: existingExercise, error: lookupError } = await lookupQuery.maybeSingle();

  if (lookupError) {
    return { data: null, error: { message: lookupError.message } };
  }

  if (!existingExercise) {
    return { data: null, error: { message: "Exercise is not editable for your gym." } };
  }

  if (!scope.isSuperAdmin && !canManageGymContent(scope)) {
    return { data: null, error: { message: "You do not have permission to edit exercises." } };
  }

  let updateQuery = supabase
    .from("exercise_library")
    .update(normalizeExercisePayload(values))
    .eq("id", exerciseId);

  if (!scope.isSuperAdmin) {
    updateQuery = updateQuery.eq("gym_id", scope.gymId ?? "");
  }

  return updateQuery.select("id").single();
}

export async function canEditExerciseRecord(
  supabase: AppSupabaseClient,
  exerciseId: string,
): Promise<{ data: boolean; error: string | null }> {
  const { data: exercise, error } = await getExerciseById(supabase, exerciseId);

  if (error) {
    return { data: false, error };
  }

  return { data: Boolean(exercise?.canEdit), error: null };
}

export async function duplicateExerciseRecord(
  supabase: AppSupabaseClient,
  exerciseId: string,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError ?? "Unable to resolve gym scope." };
  }

  if (scope.isSuperAdmin || !canManageGymContent(scope)) {
    return { data: null, error: "You do not have permission to duplicate this exercise." };
  }

  const { data: exercise, error } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("id", exerciseId)
    .is("gym_id", null)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!exercise) {
    return { data: null, error: "Only system exercises can be duplicated." };
  }

  const record = exercise as ExerciseLibraryRecord;
  const { data: existingCopies, error: copyLookupError } = await supabase
    .from("exercise_library")
    .select("name, slug")
    .eq("gym_id", scope.gymId ?? "")
    .ilike("name", `${record.name} personalizado%`);

  if (copyLookupError) {
    return { data: null, error: copyLookupError.message };
  }

  const { data: existingSlugs, error: slugLookupError } = await supabase
    .from("exercise_library")
    .select("slug")
    .ilike("slug", `${record.slug}-personalizado%`);

  if (slugLookupError) {
    return { data: null, error: slugLookupError.message };
  }

  const copyName = buildDuplicateName(
    record.name,
    new Set((existingCopies ?? []).map((copy) => String(copy.name).toLowerCase())),
  );
  const copySlug = buildDuplicateSlug(
    record.slug,
    new Set((existingSlugs ?? []).map((copy) => String(copy.slug))),
  );

  return supabase
    .from("exercise_library")
    .insert({
      name: copyName,
      slug: copySlug,
      description: record.description,
      video_url: record.video_url,
      thumbnail_url: record.thumbnail_url,
      primary_muscle: record.primary_muscle,
      secondary_muscle: record.secondary_muscle,
      equipment: record.equipment,
      difficulty: record.difficulty,
      instructions: record.instructions,
      coach_tips: record.coach_tips,
      common_mistakes: record.common_mistakes,
      is_active: record.is_active,
      gym_id: scope.gymId,
      created_by: scope.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function deactivateExerciseRecord(
  supabase: AppSupabaseClient,
  exerciseId: string,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { error: scopeError ?? "Unable to resolve gym scope." };
  }

  if (!canManageGymContent(scope)) {
    return { error: "You do not have permission to deactivate exercises." };
  }

  let updateQuery = supabase
    .from("exercise_library")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", exerciseId)
    .not("gym_id", "is", null);

  if (!scope.isSuperAdmin) {
    updateQuery = updateQuery.eq("gym_id", scope.gymId ?? "");
  }

  const { error } = await updateQuery.select("id").single();

  return { error: error?.message ?? null };
}

export const getExercisesForPage = cache(async () => {
  const supabase = await createClient();
  return listExercises(supabase);
});

export const getExerciseForPage = cache(async (exerciseId: string) => {
  const supabase = await createClient();
  return getExerciseById(supabase, exerciseId);
});

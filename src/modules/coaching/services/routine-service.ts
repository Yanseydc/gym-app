import { cache } from "react";

import { applyGymScope, requireGymScope, withGymId, type GymScope } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ClientRoutine,
  ClientRoutineDay,
  ClientRoutineDayRecord,
  ClientRoutineExercise,
  ClientRoutineExerciseMedia,
  ClientRoutineExerciseRecord,
  ClientRoutineRecord,
  ClientRoutineSummary,
  ExerciseMediaRecord,
  RoutineClientOption,
  RoutineDayFormValues,
  RoutineExerciseFormValues,
  RoutineExerciseOption,
  RoutineFormValues,
} from "@/modules/coaching/types";
import { restMinutesToSeconds } from "@/modules/coaching/utils/rest-time";

type ActivateRoutineResult = {
  archived_previous: boolean;
  id: string;
};

type RoutineActivationError = {
  code?: string | null;
  message: string;
};

type RoutineActivationRpcClient = AppSupabaseClient & {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RoutineActivationError | null }>;
};

function mapRoutineExercise(
  record: ClientRoutineExerciseRecord,
  exerciseInfo: {
    name: string;
    slug: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    instructions: string | null;
    coachTips: string | null;
    commonMistakes: string | null;
    media: ClientRoutineExerciseMedia[];
  },
): ClientRoutineExercise {
  return {
    id: record.id,
    exerciseId: record.exercise_id,
    exerciseName: exerciseInfo.name,
    exerciseSlug: exerciseInfo.slug,
    videoUrl: exerciseInfo.videoUrl,
    thumbnailUrl: exerciseInfo.thumbnailUrl,
    instructions: exerciseInfo.instructions,
    coachTips: exerciseInfo.coachTips,
    commonMistakes: exerciseInfo.commonMistakes,
    media: exerciseInfo.media,
    sortOrder: record.sort_order,
    setsText: record.sets_text,
    repsText: record.reps_text,
    targetWeightText: record.target_weight_text,
    restSeconds: record.rest_seconds,
    notes: record.notes,
    createdAt: record.created_at,
  };
}

function mapRoutineDay(
  record: ClientRoutineDayRecord,
  exercises: ClientRoutineExercise[],
): ClientRoutineDay {
  return {
    id: record.id,
    dayIndex: record.day_index,
    title: record.title,
    notes: record.notes,
    createdAt: record.created_at,
    exercises,
  };
}

function mapRoutineSummary(
  record: ClientRoutineRecord,
  dayCount: number,
): ClientRoutineSummary {
  return {
    id: record.id,
    clientId: record.client_id,
    title: record.title,
    status: record.status,
    startsOn: record.starts_on,
    endsOn: record.ends_on,
    dayCount,
    updatedAt: record.updated_at,
  };
}

function mapExerciseMedia(record: ExerciseMediaRecord): ClientRoutineExerciseMedia {
  return {
    id: record.id,
    url: record.url,
    sortOrder: record.sort_order,
    altText: record.alt_text,
    createdAt: record.created_at,
  };
}

function normalizeRoutinePayload(values: RoutineFormValues) {
  return {
    client_id: values.clientId,
    title: values.title.trim(),
    notes: values.notes.trim() || null,
    status: values.status,
    starts_on: values.startsOn || null,
    ends_on: values.endsOn || null,
    updated_at: new Date().toISOString(),
  };
}

function normalizeRoutineDayPayload(values: RoutineDayFormValues) {
  return {
    day_index: values.dayIndex,
    title: values.title.trim(),
    notes: values.notes.trim() || null,
  };
}

function normalizeRoutineExercisePayload(values: RoutineExerciseFormValues) {
  return {
    exercise_id: values.exerciseId,
    sort_order: values.sortOrder,
    sets_text: values.setsText.trim(),
    reps_text: values.repsText.trim(),
    target_weight_text: values.targetWeightText.trim() || null,
    rest_seconds: restMinutesToSeconds(values.restSeconds),
    notes: values.notes.trim() || null,
  };
}

function buildDuplicatedRoutineTitle(title: string) {
  return `${title.trim()} (Copy)`;
}

async function canAccessRoutineDay(
  supabase: AppSupabaseClient,
  routineDayId: string,
  scope: GymScope,
): Promise<{ data: boolean; error: string | null }> {
  const { data: day, error: dayError } = await supabase
    .from("client_routine_days")
    .select("client_routine_id")
    .eq("id", routineDayId)
    .maybeSingle();

  if (dayError) {
    return { data: false, error: dayError.message };
  }

  if (!day) {
    return { data: false, error: null };
  }

  let routineQuery = supabase
    .from("client_routines")
    .select("id")
    .eq("id", String(day.client_routine_id));

  routineQuery = applyGymScope(routineQuery, scope);

  const { data: routine, error: routineError } = await routineQuery.maybeSingle();

  if (routineError) {
    return { data: false, error: routineError.message };
  }

  return { data: Boolean(routine), error: null };
}

async function canAccessRoutineExercise(
  supabase: AppSupabaseClient,
  routineExerciseId: string,
  scope: GymScope,
): Promise<{ data: boolean; error: string | null }> {
  const { data: exercise, error: exerciseError } = await supabase
    .from("client_routine_exercises")
    .select("client_routine_day_id")
    .eq("id", routineExerciseId)
    .maybeSingle();

  if (exerciseError) {
    return { data: false, error: exerciseError.message };
  }

  if (!exercise) {
    return { data: false, error: null };
  }

  return canAccessRoutineDay(supabase, String(exercise.client_routine_day_id), scope);
}

export async function listRoutineClientOptions(
  supabase: AppSupabaseClient,
): Promise<{ data: RoutineClientOption[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("clients")
    .select("id, first_name, last_name")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((client) => ({
      id: String(client.id),
      label: `${String(client.first_name)} ${String(client.last_name)}`,
    })),
    error: null,
  };
}

export async function listRoutineExerciseOptions(
  supabase: AppSupabaseClient,
): Promise<{ data: RoutineExerciseOption[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("exercise_library")
    .select("id, name, difficulty, primary_muscle, equipment, gym_id")
    .eq("is_active", true)
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
    data: (data ?? []).map((exercise) => ({
      id: String(exercise.id),
      label: String(exercise.name),
      difficulty: exercise.difficulty,
      primaryMuscle: exercise.primary_muscle,
      equipment: exercise.equipment,
      source: exercise.gym_id ? "gym" : "system",
    })),
    error: null,
  };
}

export async function listRoutineSummariesByClient(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientRoutineSummary[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("client_routines")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  const records = (data ?? []) as ClientRoutineRecord[];

  if (records.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const { data: days, error: daysError } = await supabase
    .from("client_routine_days")
    .select("id, client_routine_id")
    .in(
      "client_routine_id",
      records.map((record) => record.id),
    );

  if (daysError) {
    return {
      data: [],
      error: daysError.message,
    };
  }

  const dayCountMap = (days ?? []).reduce((map, day) => {
    const routineId = String(day.client_routine_id);
    map.set(routineId, (map.get(routineId) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  return {
    data: records.map((record) => mapRoutineSummary(record, dayCountMap.get(record.id) ?? 0)),
    error: null,
  };
}

export async function getRoutineById(
  supabase: AppSupabaseClient,
  routineId: string,
): Promise<{ data: ClientRoutine | null; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError };
  }

  let routineQuery = supabase
    .from("client_routines")
    .select("*")
    .eq("id", routineId);

  routineQuery = applyGymScope(routineQuery, scope);

  const { data: routineData, error } = await routineQuery.maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  if (!routineData) {
    return {
      data: null,
      error: null,
    };
  }

  const routine = routineData as ClientRoutineRecord;

  const [{ data: clientData, error: clientError }, { data: dayData, error: dayError }] =
    await Promise.all([
      applyGymScope(supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("id", routine.client_id), scope)
        .maybeSingle(),
      supabase
        .from("client_routine_days")
        .select("*")
        .eq("client_routine_id", routineId)
        .order("day_index", { ascending: true }),
    ]);

  if (clientError) {
    return {
      data: null,
      error: clientError.message,
    };
  }

  if (dayError) {
    return {
      data: null,
      error: dayError.message,
    };
  }

  const days = (dayData ?? []) as ClientRoutineDayRecord[];
  const dayIds = days.map((day) => day.id);

  let exercises: ClientRoutineExerciseRecord[] = [];

  if (dayIds.length > 0) {
    const { data: exerciseRows, error: exercisesError } = await supabase
      .from("client_routine_exercises")
      .select("*")
      .in("client_routine_day_id", dayIds)
      .order("sort_order", { ascending: true });

    if (exercisesError) {
      return {
        data: null,
        error: exercisesError.message,
      };
    }

    exercises = (exerciseRows ?? []) as ClientRoutineExerciseRecord[];
  }

  const exerciseIds = [...new Set(exercises.map((exercise) => exercise.exercise_id))];
  let exerciseMap = new Map<
    string,
    {
      name: string;
      slug: string;
      videoUrl: string | null;
      thumbnailUrl: string | null;
      instructions: string | null;
      coachTips: string | null;
      commonMistakes: string | null;
      media: ClientRoutineExerciseMedia[];
    }
  >();

  if (exerciseIds.length > 0) {
    const [{ data: exerciseLibraryRows, error: libraryError }, { data: mediaRows, error: mediaError }] =
      await Promise.all([
        supabase
          .from("exercise_library")
          .select("id, name, slug, video_url, thumbnail_url, instructions, coach_tips, common_mistakes")
          .in("id", exerciseIds),
        supabase
          .from("exercise_media")
          .select("id, exercise_id, url, sort_order, alt_text, created_at")
          .in("exercise_id", exerciseIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

    if (libraryError) {
      return {
        data: null,
        error: libraryError.message,
      };
    }

    if (mediaError) {
      return {
        data: null,
        error: mediaError.message,
      };
    }

    const mediaByExercise = (mediaRows ?? []).reduce((map, mediaRow) => {
      const exerciseId = String(mediaRow.exercise_id);
      const list = map.get(exerciseId) ?? [];
      list.push(mapExerciseMedia(mediaRow as ExerciseMediaRecord));
      map.set(exerciseId, list);
      return map;
    }, new Map<string, ClientRoutineExerciseMedia[]>());

    exerciseMap = new Map(
      (exerciseLibraryRows ?? []).map((exercise) => [
        String(exercise.id),
        {
          name: String(exercise.name),
          slug: String(exercise.slug),
          videoUrl: exercise.video_url ? String(exercise.video_url) : null,
          thumbnailUrl: exercise.thumbnail_url ? String(exercise.thumbnail_url) : null,
          instructions: exercise.instructions ? String(exercise.instructions) : null,
          coachTips: exercise.coach_tips ? String(exercise.coach_tips) : null,
          commonMistakes: exercise.common_mistakes ? String(exercise.common_mistakes) : null,
          media: mediaByExercise.get(String(exercise.id)) ?? [],
        },
      ]),
    );
  }

  const exercisesByDay = exercises.reduce((map, exercise) => {
    const dayId = exercise.client_routine_day_id;
    const list = map.get(dayId) ?? [];
    list.push(
      mapRoutineExercise(exercise, exerciseMap.get(exercise.exercise_id) ?? {
        name: "Unknown exercise",
        slug: "unknown-exercise",
        videoUrl: null,
        thumbnailUrl: null,
        instructions: null,
        coachTips: null,
        commonMistakes: null,
        media: [],
      }),
    );
    map.set(dayId, list);
    return map;
  }, new Map<string, ClientRoutineExercise[]>());

  return {
    data: {
      id: routine.id,
      clientId: routine.client_id,
      clientName: clientData
        ? `${String(clientData.first_name)} ${String(clientData.last_name)}`
        : "Unknown client",
      coachProfileId: routine.coach_profile_id,
      title: routine.title,
      notes: routine.notes,
      status: routine.status,
      startsOn: routine.starts_on,
      endsOn: routine.ends_on,
      createdAt: routine.created_at,
      updatedAt: routine.updated_at,
      days: days.map((day) => mapRoutineDay(day, exercisesByDay.get(day.id) ?? [])),
    },
    error: null,
  };
}

export async function createRoutineRecord(
  supabase: AppSupabaseClient,
  coachProfileId: string,
  values: RoutineFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let clientQuery = supabase.from("clients").select("id").eq("id", values.clientId);
  clientQuery = applyGymScope(clientQuery, scope);
  const { data: clientData, error: clientError } = await clientQuery.maybeSingle();

  if (clientError) {
    return { data: null, error: { message: clientError.message } };
  }

  if (!clientData) {
    return { data: null, error: { message: "Selected client is not available." } };
  }

  return supabase
    .from("client_routines")
    .insert(withGymId({
      ...normalizeRoutinePayload(values),
      coach_profile_id: coachProfileId,
      created_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();
}

export async function updateRoutineRecord(
  supabase: AppSupabaseClient,
  routineId: string,
  values: RoutineFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let clientQuery = supabase.from("clients").select("id").eq("id", values.clientId);
  clientQuery = applyGymScope(clientQuery, scope);
  const { data: clientData, error: clientError } = await clientQuery.maybeSingle();

  if (clientError) {
    return { data: null, error: { message: clientError.message } };
  }

  if (!clientData) {
    return { data: null, error: { message: "Selected client is not available." } };
  }

  let query = supabase
    .from("client_routines")
    .update(normalizeRoutinePayload(values))
    .eq("id", routineId);

  query = applyGymScope(query, scope);

  return query.select("id").single();
}

export async function activateRoutineRecord(
  supabase: AppSupabaseClient,
  routineId: string,
  values: RoutineFormValues,
): Promise<{ data: { archivedPrevious: boolean; id: string } | null; error: string | null; code?: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError ?? "Unable to resolve gym scope." };
  }

  let routineQuery = supabase
    .from("client_routines")
    .select("id")
    .eq("id", routineId);
  routineQuery = applyGymScope(routineQuery, scope);
  const { data: routineData, error: routineError } = await routineQuery.maybeSingle();

  if (routineError) {
    return { data: null, error: routineError.message };
  }

  if (!routineData) {
    return { data: null, error: "Routine is not available." };
  }

  let clientQuery = supabase.from("clients").select("id").eq("id", values.clientId);
  clientQuery = applyGymScope(clientQuery, scope);
  const { data: clientData, error: clientError } = await clientQuery.maybeSingle();

  if (clientError) {
    return { data: null, error: clientError.message };
  }

  if (!clientData) {
    return { data: null, error: "Selected client is not available." };
  }

  const rpcClient = supabase as RoutineActivationRpcClient;
  const { data, error } = await rpcClient.rpc("activate_client_routine", {
    target_routine_id: routineId,
    target_client_id: values.clientId,
    target_title: values.title.trim(),
    target_notes: values.notes.trim() || null,
    target_starts_on: values.startsOn || null,
    target_ends_on: values.endsOn || null,
  });

  if (error) {
    return {
      data: null,
      error: error.message,
      code: error.code,
    };
  }

  const [result] = ((data ?? []) as unknown[]) as ActivateRoutineResult[];

  if (!result) {
    return {
      data: null,
      error: "Unable to activate routine.",
    };
  }

  return {
    data: {
      id: result.id,
      archivedPrevious: result.archived_previous,
    },
    error: null,
  };
}

export async function createRoutineDayRecord(
  supabase: AppSupabaseClient,
  routineId: string,
  values: RoutineDayFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let routineQuery = supabase.from("client_routines").select("id").eq("id", routineId);
  routineQuery = applyGymScope(routineQuery, scope);
  const { data: routineData, error: routineError } = await routineQuery.maybeSingle();

  if (routineError) {
    return { data: null, error: { message: routineError.message } };
  }

  if (!routineData) {
    return { data: null, error: { message: "Routine is not available." } };
  }

  return supabase
    .from("client_routine_days")
    .insert({
      ...normalizeRoutineDayPayload(values),
      client_routine_id: routineId,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function updateRoutineDayRecord(
  supabase: AppSupabaseClient,
  routineDayId: string,
  values: RoutineDayFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  const canAccess = await canAccessRoutineDay(supabase, routineDayId, scope);
  if (canAccess.error || !canAccess.data) {
    return { data: null, error: { message: canAccess.error ?? "Routine day is not available." } };
  }

  return supabase
    .from("client_routine_days")
    .update(normalizeRoutineDayPayload(values))
    .eq("id", routineDayId)
    .select("id")
    .single();
}

export async function deleteRoutineDayRecord(
  supabase: AppSupabaseClient,
  routineDayId: string,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  const canAccess = await canAccessRoutineDay(supabase, routineDayId, scope);
  if (canAccess.error || !canAccess.data) {
    return { data: null, error: { message: canAccess.error ?? "Routine day is not available." } };
  }

  const { error: exerciseError } = await supabase
    .from("client_routine_exercises")
    .delete()
    .eq("client_routine_day_id", routineDayId);

  if (exerciseError) {
    return {
      data: null,
      error: exerciseError,
    };
  }

  return supabase
    .from("client_routine_days")
    .delete()
    .eq("id", routineDayId)
    .select("id")
    .single();
}

export async function createRoutineExerciseRecord(
  supabase: AppSupabaseClient,
  routineDayId: string,
  values: RoutineExerciseFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  const canAccess = await canAccessRoutineDay(supabase, routineDayId, scope);
  if (canAccess.error || !canAccess.data) {
    return { data: null, error: { message: canAccess.error ?? "Routine day is not available." } };
  }

  let exerciseQuery = supabase
    .from("exercise_library")
    .select("id, gym_id")
    .eq("id", values.exerciseId)
    .eq("is_active", true);

  if (!scope.isSuperAdmin) {
    exerciseQuery = exerciseQuery.or(`gym_id.is.null,gym_id.eq.${scope.gymId}`);
  }

  const { data: exerciseData, error: exerciseError } = await exerciseQuery.maybeSingle();

  if (exerciseError) {
    return { data: null, error: { message: exerciseError.message } };
  }

  if (!exerciseData) {
    return { data: null, error: { message: "Selected exercise is not available." } };
  }

  return supabase
    .from("client_routine_exercises")
    .insert({
      ...normalizeRoutineExercisePayload(values),
      client_routine_day_id: routineDayId,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function updateRoutineExerciseRecord(
  supabase: AppSupabaseClient,
  routineExerciseId: string,
  values: RoutineExerciseFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  const canAccess = await canAccessRoutineExercise(supabase, routineExerciseId, scope);
  if (canAccess.error || !canAccess.data) {
    return { data: null, error: { message: canAccess.error ?? "Routine exercise is not available." } };
  }

  let exerciseQuery = supabase
    .from("exercise_library")
    .select("id, gym_id")
    .eq("id", values.exerciseId)
    .eq("is_active", true);

  if (!scope.isSuperAdmin) {
    exerciseQuery = exerciseQuery.or(`gym_id.is.null,gym_id.eq.${scope.gymId}`);
  }

  const { data: exerciseData, error: exerciseError } = await exerciseQuery.maybeSingle();

  if (exerciseError) {
    return { data: null, error: { message: exerciseError.message } };
  }

  if (!exerciseData) {
    return { data: null, error: { message: "Selected exercise is not available." } };
  }

  return supabase
    .from("client_routine_exercises")
    .update(normalizeRoutineExercisePayload(values))
    .eq("id", routineExerciseId)
    .select("id")
    .single();
}

export async function reorderRoutineDaysRecord(
  supabase: AppSupabaseClient,
  routineId: string,
  dayIds: string[],
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let routineQuery = supabase.from("client_routines").select("id").eq("id", routineId);
  routineQuery = applyGymScope(routineQuery, scope);
  const { data: routineData, error: routineError } = await routineQuery.maybeSingle();

  if (routineError || !routineData) {
    return { data: null, error: { message: routineError?.message ?? "Routine is not available." } };
  }

  return supabase.rpc("reorder_client_routine_days", {
    p_routine_id: routineId,
    p_day_ids: dayIds,
  });
}

export async function reorderRoutineExercisesRecord(
  supabase: AppSupabaseClient,
  routineDayId: string,
  exerciseIds: string[],
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  const canAccess = await canAccessRoutineDay(supabase, routineDayId, scope);
  if (canAccess.error || !canAccess.data) {
    return { data: null, error: { message: canAccess.error ?? "Routine day is not available." } };
  }

  return supabase.rpc("reorder_client_routine_exercises", {
    p_routine_day_id: routineDayId,
    p_exercise_ids: exerciseIds,
  });
}

export async function deleteRoutineExerciseRecord(
  supabase: AppSupabaseClient,
  routineExerciseId: string,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  const canAccess = await canAccessRoutineExercise(supabase, routineExerciseId, scope);
  if (canAccess.error || !canAccess.data) {
    return { data: null, error: { message: canAccess.error ?? "Routine exercise is not available." } };
  }

  return supabase
    .from("client_routine_exercises")
    .delete()
    .eq("id", routineExerciseId)
    .select("id")
    .single();
}

export async function duplicateRoutineRecord(
  supabase: AppSupabaseClient,
  coachProfileId: string,
  sourceRoutine: ClientRoutine,
): Promise<{ data: { id: string } | null; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError ?? "Unable to resolve gym scope." };
  }

  const createdAt = new Date().toISOString();

  const { data: duplicatedRoutine, error: routineError } = await supabase
    .from("client_routines")
    .insert(withGymId({
      client_id: sourceRoutine.clientId,
      coach_profile_id: coachProfileId,
      title: buildDuplicatedRoutineTitle(sourceRoutine.title),
      notes: sourceRoutine.notes,
      status: "draft",
      starts_on: null,
      ends_on: null,
      created_at: createdAt,
      updated_at: createdAt,
    }, scope))
    .select("id")
    .single();

  if (routineError || !duplicatedRoutine) {
    return {
      data: null,
      error: routineError?.message ?? "Unable to duplicate routine.",
    };
  }

  const duplicatedRoutineId = String(duplicatedRoutine.id);
  const duplicatedDayIds = new Map<string, string>();

  for (const day of sourceRoutine.days) {
    const { data: duplicatedDay, error: dayError } = await supabase
      .from("client_routine_days")
      .insert({
        client_routine_id: duplicatedRoutineId,
        day_index: day.dayIndex,
        title: day.title,
        notes: day.notes,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (dayError || !duplicatedDay) {
      await supabase.from("client_routines").delete().eq("id", duplicatedRoutineId);

      return {
        data: null,
        error: dayError?.message ?? "Unable to duplicate routine days.",
      };
    }

    duplicatedDayIds.set(day.id, String(duplicatedDay.id));
  }

  const duplicatedExercises = sourceRoutine.days.flatMap((day) => {
    const duplicatedDayId = duplicatedDayIds.get(day.id);

    if (!duplicatedDayId) {
      return [];
    }

    return day.exercises.map((exercise) => ({
      client_routine_day_id: duplicatedDayId,
      exercise_id: exercise.exerciseId,
      sort_order: exercise.sortOrder,
      sets_text: exercise.setsText,
      reps_text: exercise.repsText,
      target_weight_text: exercise.targetWeightText,
      rest_seconds: exercise.restSeconds,
      notes: exercise.notes,
      created_at: createdAt,
    }));
  });

  if (duplicatedExercises.length > 0) {
    const { error: exercisesError } = await supabase
      .from("client_routine_exercises")
      .insert(duplicatedExercises);

    if (exercisesError) {
      await supabase.from("client_routines").delete().eq("id", duplicatedRoutineId);

      return {
        data: null,
        error: exercisesError.message,
      };
    }
  }

  return {
    data: {
      id: duplicatedRoutineId,
    },
    error: null,
  };
}

export const getRoutineClientOptionsForPage = cache(async () => {
  const supabase = await createClient();
  return listRoutineClientOptions(supabase);
});

export const getRoutineExerciseOptionsForPage = cache(async () => {
  const supabase = await createClient();
  return listRoutineExerciseOptions(supabase);
});

export const getRoutineForPage = cache(async (routineId: string) => {
  const supabase = await createClient();
  return getRoutineById(supabase, routineId);
});

export const getClientRoutineSummariesForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return listRoutineSummariesByClient(supabase, clientId);
});

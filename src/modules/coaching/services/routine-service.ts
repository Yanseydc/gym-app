import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ClientRoutine,
  ClientRoutineDay,
  ClientRoutineDayRecord,
  ClientRoutineExercise,
  ClientRoutineExerciseRecord,
  ClientRoutineRecord,
  ClientRoutineSummary,
  RoutineClientOption,
  RoutineDayFormValues,
  RoutineExerciseFormValues,
  RoutineExerciseOption,
  RoutineFormValues,
} from "@/modules/coaching/types";

function mapRoutineExercise(
  record: ClientRoutineExerciseRecord,
  exerciseInfo: { name: string; slug: string; videoUrl: string | null },
): ClientRoutineExercise {
  return {
    id: record.id,
    exerciseId: record.exercise_id,
    exerciseName: exerciseInfo.name,
    exerciseSlug: exerciseInfo.slug,
    videoUrl: exerciseInfo.videoUrl,
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
    rest_seconds: values.restSeconds ? Number(values.restSeconds) : null,
    notes: values.notes.trim() || null,
  };
}

function buildDuplicatedRoutineTitle(title: string) {
  return `${title.trim()} (Copy)`;
}

export async function listRoutineClientOptions(
  supabase: AppSupabaseClient,
): Promise<{ data: RoutineClientOption[]; error: string | null }> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

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
  const { data, error } = await supabase
    .from("exercise_library")
    .select("id, name, difficulty, primary_muscle")
    .eq("is_active", true)
    .order("name", { ascending: true });

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
    })),
    error: null,
  };
}

export async function listRoutineSummariesByClient(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientRoutineSummary[]; error: string | null }> {
  const { data, error } = await supabase
    .from("client_routines")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

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
  const { data: routineData, error } = await supabase
    .from("client_routines")
    .select("*")
    .eq("id", routineId)
    .maybeSingle();

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
      supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("id", routine.client_id)
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
  let exerciseMap = new Map<string, { name: string; slug: string; videoUrl: string | null }>();

  if (exerciseIds.length > 0) {
    const { data: exerciseLibraryRows, error: libraryError } = await supabase
      .from("exercise_library")
      .select("id, name, slug, video_url")
      .in("id", exerciseIds);

    if (libraryError) {
      return {
        data: null,
        error: libraryError.message,
      };
    }

    exerciseMap = new Map(
      (exerciseLibraryRows ?? []).map((exercise) => [
        String(exercise.id),
        {
          name: String(exercise.name),
          slug: String(exercise.slug),
          videoUrl: exercise.video_url ? String(exercise.video_url) : null,
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
  return supabase
    .from("client_routines")
    .insert({
      ...normalizeRoutinePayload(values),
      coach_profile_id: coachProfileId,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function updateRoutineRecord(
  supabase: AppSupabaseClient,
  routineId: string,
  values: RoutineFormValues,
) {
  return supabase
    .from("client_routines")
    .update(normalizeRoutinePayload(values))
    .eq("id", routineId)
    .select("id")
    .single();
}

export async function createRoutineDayRecord(
  supabase: AppSupabaseClient,
  routineId: string,
  values: RoutineDayFormValues,
) {
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

export async function createRoutineExerciseRecord(
  supabase: AppSupabaseClient,
  routineDayId: string,
  values: RoutineExerciseFormValues,
) {
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

export async function duplicateRoutineRecord(
  supabase: AppSupabaseClient,
  coachProfileId: string,
  sourceRoutine: ClientRoutine,
): Promise<{ data: { id: string } | null; error: string | null }> {
  const createdAt = new Date().toISOString();

  const { data: duplicatedRoutine, error: routineError } = await supabase
    .from("client_routines")
    .insert({
      client_id: sourceRoutine.clientId,
      coach_profile_id: coachProfileId,
      title: buildDuplicatedRoutineTitle(sourceRoutine.title),
      notes: sourceRoutine.notes,
      status: "draft",
      starts_on: null,
      ends_on: null,
      created_at: createdAt,
      updated_at: createdAt,
    })
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

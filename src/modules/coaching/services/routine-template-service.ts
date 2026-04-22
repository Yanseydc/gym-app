import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ClientRoutine,
  RoutineClientOption,
  RoutineFormValues,
  RoutineTemplate,
  RoutineTemplateApplyFormValues,
  RoutineTemplateDay,
  RoutineTemplateDayRecord,
  RoutineTemplateExercise,
  RoutineTemplateExerciseRecord,
  RoutineTemplateFormValues,
  RoutineTemplateRecord,
  RoutineTemplateSummary,
} from "@/modules/coaching/types";

function mapTemplateExercise(
  record: RoutineTemplateExerciseRecord,
  exerciseInfo: { name: string; slug: string },
): RoutineTemplateExercise {
  return {
    id: record.id,
    exerciseId: record.exercise_id,
    exerciseName: exerciseInfo.name,
    exerciseSlug: exerciseInfo.slug,
    sortOrder: record.sort_order,
    setsText: record.sets_text,
    repsText: record.reps_text,
    targetWeightText: record.target_weight_text,
    restSeconds: record.rest_seconds,
    notes: record.notes,
    createdAt: record.created_at,
  };
}

function mapTemplateDay(
  record: RoutineTemplateDayRecord,
  exercises: RoutineTemplateExercise[],
): RoutineTemplateDay {
  return {
    id: record.id,
    dayIndex: record.day_index,
    title: record.title,
    notes: record.notes,
    createdAt: record.created_at,
    exercises,
  };
}

function normalizeTemplatePayload(values: RoutineTemplateFormValues) {
  return {
    title: values.title.trim(),
    notes: values.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

function countTemplateExercises(days: RoutineTemplateDay[]) {
  return days.reduce((count, day) => count + day.exercises.length, 0);
}

async function getExerciseLookup(
  supabase: AppSupabaseClient,
  exerciseIds: string[],
): Promise<{ data: Map<string, { name: string; slug: string }>; error: string | null }> {
  if (exerciseIds.length === 0) {
    return {
      data: new Map<string, { name: string; slug: string }>(),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("exercise_library")
    .select("id, name, slug")
    .in("id", exerciseIds);

  if (error) {
    return {
      data: new Map<string, { name: string; slug: string }>(),
      error: error.message,
    };
  }

  return {
    data: new Map(
      (data ?? []).map((exercise) => [
        String(exercise.id),
        { name: String(exercise.name), slug: String(exercise.slug) },
      ]),
    ),
    error: null,
  };
}

export async function listRoutineTemplates(
  supabase: AppSupabaseClient,
): Promise<{ data: RoutineTemplateSummary[]; error: string | null }> {
  const { data, error } = await supabase
    .from("routine_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  const templates = (data ?? []) as RoutineTemplateRecord[];

  if (templates.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const templateIds = templates.map((template) => template.id);
  const { data: dayRows, error: daysError } = await supabase
    .from("routine_template_days")
    .select("id, routine_template_id")
    .in("routine_template_id", templateIds);

  if (daysError) {
    return {
      data: [],
      error: daysError.message,
    };
  }

  const dayCountMap = new Map<string, number>();
  const dayIds: string[] = [];

  for (const row of dayRows ?? []) {
    const templateId = String(row.routine_template_id);
    dayCountMap.set(templateId, (dayCountMap.get(templateId) ?? 0) + 1);
    dayIds.push(String(row.id));
  }

  let exerciseCountMap = new Map<string, number>();

  if (dayIds.length > 0) {
    const { data: exerciseRows, error: exercisesError } = await supabase
      .from("routine_template_exercises")
      .select("routine_template_day_id")
      .in("routine_template_day_id", dayIds);

    if (exercisesError) {
      return {
        data: [],
        error: exercisesError.message,
      };
    }

    const templateByDayId = new Map(
      (dayRows ?? []).map((row) => [String(row.id), String(row.routine_template_id)]),
    );

    exerciseCountMap = (exerciseRows ?? []).reduce((map, row) => {
      const templateId = templateByDayId.get(String(row.routine_template_day_id));

      if (!templateId) {
        return map;
      }

      map.set(templateId, (map.get(templateId) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  }

  return {
    data: templates.map((template) => ({
      id: template.id,
      title: template.title,
      notes: template.notes,
      dayCount: dayCountMap.get(template.id) ?? 0,
      exerciseCount: exerciseCountMap.get(template.id) ?? 0,
      updatedAt: template.updated_at,
    })),
    error: null,
  };
}

export async function getRoutineTemplateById(
  supabase: AppSupabaseClient,
  templateId: string,
): Promise<{ data: RoutineTemplate | null; error: string | null }> {
  const { data: templateData, error } = await supabase
    .from("routine_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  if (!templateData) {
    return {
      data: null,
      error: null,
    };
  }

  const template = templateData as RoutineTemplateRecord;
  const { data: dayRows, error: daysError } = await supabase
    .from("routine_template_days")
    .select("*")
    .eq("routine_template_id", templateId)
    .order("day_index", { ascending: true });

  if (daysError) {
    return {
      data: null,
      error: daysError.message,
    };
  }

  const days = (dayRows ?? []) as RoutineTemplateDayRecord[];
  const dayIds = days.map((day) => day.id);

  let exercises: RoutineTemplateExerciseRecord[] = [];

  if (dayIds.length > 0) {
    const { data: exerciseRows, error: exercisesError } = await supabase
      .from("routine_template_exercises")
      .select("*")
      .in("routine_template_day_id", dayIds)
      .order("sort_order", { ascending: true });

    if (exercisesError) {
      return {
        data: null,
        error: exercisesError.message,
      };
    }

    exercises = (exerciseRows ?? []) as RoutineTemplateExerciseRecord[];
  }

  const exerciseLookup = await getExerciseLookup(
    supabase,
    [...new Set(exercises.map((exercise) => exercise.exercise_id))],
  );

  if (exerciseLookup.error) {
    return {
      data: null,
      error: exerciseLookup.error,
    };
  }

  const exercisesByDay = exercises.reduce((map, exercise) => {
    const dayId = exercise.routine_template_day_id;
    const list = map.get(dayId) ?? [];

    list.push(
      mapTemplateExercise(exercise, exerciseLookup.data.get(exercise.exercise_id) ?? {
        name: "Unknown exercise",
        slug: "unknown-exercise",
      }),
    );
    map.set(dayId, list);
    return map;
  }, new Map<string, RoutineTemplateExercise[]>());

  return {
    data: {
      id: template.id,
      title: template.title,
      notes: template.notes,
      createdByProfileId: template.created_by_profile_id,
      sourceRoutineId: template.source_routine_id,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      days: days.map((day) => mapTemplateDay(day, exercisesByDay.get(day.id) ?? [])),
    },
    error: null,
  };
}

export async function createRoutineTemplateRecord(
  supabase: AppSupabaseClient,
  createdByProfileId: string,
  sourceRoutine: ClientRoutine,
  values: RoutineTemplateFormValues,
): Promise<{ data: { id: string } | null; error: string | null }> {
  const createdAt = new Date().toISOString();
  const { data: templateRow, error: templateError } = await supabase
    .from("routine_templates")
    .insert({
      ...normalizeTemplatePayload(values),
      created_by_profile_id: createdByProfileId,
      source_routine_id: sourceRoutine.id,
      created_at: createdAt,
    })
    .select("id")
    .single();

  if (templateError || !templateRow) {
    return {
      data: null,
      error: templateError?.message ?? "Unable to save routine template.",
    };
  }

  const templateId = String(templateRow.id);
  const templateDayIds = new Map<string, string>();

  for (const day of sourceRoutine.days) {
    const { data: dayRow, error: dayError } = await supabase
      .from("routine_template_days")
      .insert({
        routine_template_id: templateId,
        day_index: day.dayIndex,
        title: day.title,
        notes: day.notes,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (dayError || !dayRow) {
      await supabase.from("routine_templates").delete().eq("id", templateId);
      return {
        data: null,
        error: dayError?.message ?? "Unable to save template days.",
      };
    }

    templateDayIds.set(day.id, String(dayRow.id));
  }

  const templateExercises = sourceRoutine.days.flatMap((day) => {
    const templateDayId = templateDayIds.get(day.id);

    if (!templateDayId) {
      return [];
    }

    return day.exercises.map((exercise) => ({
      routine_template_day_id: templateDayId,
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

  if (templateExercises.length > 0) {
    const { error: exercisesError } = await supabase
      .from("routine_template_exercises")
      .insert(templateExercises);

    if (exercisesError) {
      await supabase.from("routine_templates").delete().eq("id", templateId);
      return {
        data: null,
        error: exercisesError.message,
      };
    }
  }

  return {
    data: {
      id: templateId,
    },
    error: null,
  };
}

export async function applyRoutineTemplateRecord(
  supabase: AppSupabaseClient,
  coachProfileId: string,
  template: RoutineTemplate,
  values: RoutineTemplateApplyFormValues,
): Promise<{ data: { id: string } | null; error: string | null }> {
  const createdAt = new Date().toISOString();
  const routinePayload: RoutineFormValues = {
    clientId: values.clientId,
    title: template.title,
    notes: template.notes ?? "",
    status: "draft",
    startsOn: "",
    endsOn: "",
  };

  const { data: routineRow, error: routineError } = await supabase
    .from("client_routines")
    .insert({
      client_id: routinePayload.clientId,
      coach_profile_id: coachProfileId,
      title: routinePayload.title,
      notes: routinePayload.notes || null,
      status: "draft",
      starts_on: null,
      ends_on: null,
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select("id")
    .single();

  if (routineError || !routineRow) {
    return {
      data: null,
      error: routineError?.message ?? "Unable to apply template to client.",
    };
  }

  const routineId = String(routineRow.id);
  const routineDayIds = new Map<string, string>();

  for (const day of template.days) {
    const { data: dayRow, error: dayError } = await supabase
      .from("client_routine_days")
      .insert({
        client_routine_id: routineId,
        day_index: day.dayIndex,
        title: day.title,
        notes: day.notes,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (dayError || !dayRow) {
      await supabase.from("client_routines").delete().eq("id", routineId);
      return {
        data: null,
        error: dayError?.message ?? "Unable to create routine days from template.",
      };
    }

    routineDayIds.set(day.id, String(dayRow.id));
  }

  const routineExercises = template.days.flatMap((day) => {
    const routineDayId = routineDayIds.get(day.id);

    if (!routineDayId) {
      return [];
    }

    return day.exercises.map((exercise) => ({
      client_routine_day_id: routineDayId,
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

  if (routineExercises.length > 0) {
    const { error: exercisesError } = await supabase
      .from("client_routine_exercises")
      .insert(routineExercises);

    if (exercisesError) {
      await supabase.from("client_routines").delete().eq("id", routineId);
      return {
        data: null,
        error: exercisesError.message,
      };
    }
  }

  return {
    data: {
      id: routineId,
    },
    error: null,
  };
}

export const getRoutineTemplatesForPage = cache(async () => {
  const supabase = await createClient();
  return listRoutineTemplates(supabase);
});

export const getRoutineTemplateForPage = cache(async (templateId: string) => {
  const supabase = await createClient();
  return getRoutineTemplateById(supabase, templateId);
});

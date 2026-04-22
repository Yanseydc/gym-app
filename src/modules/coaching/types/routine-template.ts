import type { Database } from "@/types/database";

export type RoutineTemplateRecord = Database["public"]["Tables"]["routine_templates"]["Row"];
export type RoutineTemplateDayRecord = Database["public"]["Tables"]["routine_template_days"]["Row"];
export type RoutineTemplateExerciseRecord =
  Database["public"]["Tables"]["routine_template_exercises"]["Row"];

export type RoutineTemplateExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseSlug: string;
  sortOrder: number;
  setsText: string;
  repsText: string;
  targetWeightText: string | null;
  restSeconds: number | null;
  notes: string | null;
  createdAt: string;
};

export type RoutineTemplateDay = {
  id: string;
  dayIndex: number;
  title: string;
  notes: string | null;
  createdAt: string;
  exercises: RoutineTemplateExercise[];
};

export type RoutineTemplate = {
  id: string;
  title: string;
  notes: string | null;
  createdByProfileId: string | null;
  sourceRoutineId: string | null;
  createdAt: string;
  updatedAt: string;
  days: RoutineTemplateDay[];
};

export type RoutineTemplateSummary = {
  id: string;
  title: string;
  notes: string | null;
  dayCount: number;
  exerciseCount: number;
  updatedAt: string;
};

export type RoutineTemplateFormValues = {
  title: string;
  notes: string;
};

export type RoutineTemplateApplyFormValues = {
  clientId: string;
};

export type RoutineTemplateMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof RoutineTemplateFormValues, string>>;
};

export type RoutineTemplateApplyMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof RoutineTemplateApplyFormValues, string>>;
};

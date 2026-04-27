import type { Database } from "@/types/database";

export type ClientRoutineRecord = Database["public"]["Tables"]["client_routines"]["Row"];
export type ClientRoutineDayRecord = Database["public"]["Tables"]["client_routine_days"]["Row"];
export type ClientRoutineExerciseRecord =
  Database["public"]["Tables"]["client_routine_exercises"]["Row"];
export type ExerciseMediaRecord = Database["public"]["Tables"]["exercise_media"]["Row"];

export type ClientRoutineStatus = ClientRoutineRecord["status"];

export type RoutineClientOption = {
  id: string;
  label: string;
};

export type RoutineExerciseOption = {
  id: string;
  label: string;
  difficulty: Database["public"]["Tables"]["exercise_library"]["Row"]["difficulty"];
  primaryMuscle: string | null;
  equipment: string | null;
  source: "system" | "gym";
};

export type ClientRoutineExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseSlug: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  instructions: string | null;
  coachTips: string | null;
  commonMistakes: string | null;
  media: ClientRoutineExerciseMedia[];
  sortOrder: number;
  setsText: string;
  repsText: string;
  targetWeightText: string | null;
  restSeconds: number | null;
  notes: string | null;
  createdAt: string;
};

export type ClientRoutineExerciseMedia = {
  id: string;
  url: string;
  sortOrder: number;
  altText: string | null;
  createdAt: string;
};

export type ClientRoutineDay = {
  id: string;
  dayIndex: number;
  title: string;
  notes: string | null;
  createdAt: string;
  exercises: ClientRoutineExercise[];
};

export type ClientRoutine = {
  id: string;
  clientId: string;
  clientName: string;
  coachProfileId: string | null;
  title: string;
  notes: string | null;
  status: ClientRoutineStatus;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
  days: ClientRoutineDay[];
};

export type ClientRoutineSummary = {
  id: string;
  clientId: string;
  title: string;
  status: ClientRoutineStatus;
  startsOn: string | null;
  endsOn: string | null;
  dayCount: number;
  updatedAt: string;
};

export type RoutineFormValues = {
  clientId: string;
  title: string;
  notes: string;
  status: ClientRoutineStatus;
  startsOn: string;
  endsOn: string;
};

export type RoutineDayFormValues = {
  dayIndex: number;
  title: string;
  notes: string;
};

export type RoutineExerciseFormValues = {
  exerciseId: string;
  sortOrder: number;
  setsText: string;
  repsText: string;
  targetWeightText: string;
  restSeconds: string;
  notes: string;
};

export type RoutineMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof RoutineFormValues, string>>;
};

export type RoutineDayMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof RoutineDayFormValues, string>>;
  routineDayId?: string;
};

export type RoutineExerciseMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof RoutineExerciseFormValues, string>>;
  routineExerciseId?: string;
};

import type { Database } from "@/types/database";

export type ExerciseLibraryRecord = Database["public"]["Tables"]["exercise_library"]["Row"];
export type ExerciseMediaRecord = Database["public"]["Tables"]["exercise_media"]["Row"];
export type ExerciseDifficulty = NonNullable<ExerciseLibraryRecord["difficulty"]>;

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  primaryMuscle: string | null;
  secondaryMuscle: string | null;
  equipment: string | null;
  difficulty: ExerciseDifficulty | null;
  instructions: string | null;
  coachTips: string | null;
  commonMistakes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseMediaItem = {
  id: string;
  exerciseId: string;
  url: string;
  sortOrder: number;
  altText: string | null;
  createdAt: string;
};

export type ExerciseFormValues = {
  name: string;
  slug: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  primaryMuscle: string;
  secondaryMuscle: string;
  equipment: string;
  difficulty: ExerciseDifficulty | "";
  instructions: string;
  coachTips: string;
  commonMistakes: string;
  isActive: boolean;
};

export type ExerciseMediaFormValues = {
  url: string;
  sortOrder: string;
  altText: string;
};

export type ExerciseMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof ExerciseFormValues, string>>;
};

export type ExerciseMediaMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof ExerciseMediaFormValues, string>>;
};

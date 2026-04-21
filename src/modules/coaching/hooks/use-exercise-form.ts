"use client";

import { useActionState } from "react";

import type { ExerciseMutationState } from "@/modules/coaching/types";

const initialState: ExerciseMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useExerciseForm(
  action: (
    state: ExerciseMutationState,
    formData: FormData,
  ) => Promise<ExerciseMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

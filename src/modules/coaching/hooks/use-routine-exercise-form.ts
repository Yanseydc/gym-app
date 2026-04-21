"use client";

import { useActionState } from "react";

import type { RoutineExerciseMutationState } from "@/modules/coaching/types";

const initialState: RoutineExerciseMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useRoutineExerciseForm(
  action: (
    state: RoutineExerciseMutationState,
    formData: FormData,
  ) => Promise<RoutineExerciseMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

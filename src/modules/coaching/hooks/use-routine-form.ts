"use client";

import { useActionState } from "react";

import type { RoutineMutationState } from "@/modules/coaching/types";

const initialState: RoutineMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useRoutineForm(
  action: (
    state: RoutineMutationState,
    formData: FormData,
  ) => Promise<RoutineMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

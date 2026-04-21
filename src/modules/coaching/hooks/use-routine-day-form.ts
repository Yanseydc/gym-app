"use client";

import { useActionState } from "react";

import type { RoutineDayMutationState } from "@/modules/coaching/types";

const initialState: RoutineDayMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useRoutineDayForm(
  action: (
    state: RoutineDayMutationState,
    formData: FormData,
  ) => Promise<RoutineDayMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

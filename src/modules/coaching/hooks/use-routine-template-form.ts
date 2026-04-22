"use client";

import { useActionState } from "react";

import type { RoutineTemplateMutationState } from "@/modules/coaching/types";

const initialState: RoutineTemplateMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useRoutineTemplateForm(
  action: (
    state: RoutineTemplateMutationState,
    formData: FormData,
  ) => Promise<RoutineTemplateMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

"use client";

import { useActionState } from "react";

import type { RoutineTemplateApplyMutationState } from "@/modules/coaching/types";

const initialState: RoutineTemplateApplyMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useRoutineTemplateApplyForm(
  action: (
    state: RoutineTemplateApplyMutationState,
    formData: FormData,
  ) => Promise<RoutineTemplateApplyMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

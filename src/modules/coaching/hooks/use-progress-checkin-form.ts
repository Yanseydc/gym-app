"use client";

import { useActionState } from "react";

import type { ProgressCheckInMutationState } from "@/modules/coaching/types";

const initialState: ProgressCheckInMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useProgressCheckInForm(
  action: (
    state: ProgressCheckInMutationState,
    formData: FormData,
  ) => Promise<ProgressCheckInMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

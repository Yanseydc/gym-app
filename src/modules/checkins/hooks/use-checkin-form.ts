"use client";

import { useActionState } from "react";

import type { CheckInMutationState } from "@/modules/checkins/types";

const initialState: CheckInMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useCheckInForm(
  action: (
    state: CheckInMutationState,
    formData: FormData,
  ) => Promise<CheckInMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

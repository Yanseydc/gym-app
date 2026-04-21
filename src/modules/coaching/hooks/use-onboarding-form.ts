"use client";

import { useActionState } from "react";

import type { ClientOnboardingMutationState } from "@/modules/coaching/types";

const initialState: ClientOnboardingMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useOnboardingForm(
  action: (
    state: ClientOnboardingMutationState,
    formData: FormData,
  ) => Promise<ClientOnboardingMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

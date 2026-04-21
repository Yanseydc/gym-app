"use client";

import { useActionState } from "react";

import type { PortalAccessMutationState } from "@/modules/coaching/types";

const initialState: PortalAccessMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function usePortalAccessForm(
  action: (
    state: PortalAccessMutationState,
    formData: FormData,
  ) => Promise<PortalAccessMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

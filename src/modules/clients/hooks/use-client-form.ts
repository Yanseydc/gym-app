"use client";

import { useActionState } from "react";

import type { ClientMutationState } from "@/modules/clients/types";

const initialState: ClientMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useClientForm(
  action: (
    state: ClientMutationState,
    formData: FormData,
  ) => Promise<ClientMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

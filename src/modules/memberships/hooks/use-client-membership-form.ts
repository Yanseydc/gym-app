"use client";

import { useActionState } from "react";

import type { ClientMembershipMutationState } from "@/modules/memberships/types";

const initialState: ClientMembershipMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useClientMembershipForm(
  action: (
    state: ClientMembershipMutationState,
    formData: FormData,
  ) => Promise<ClientMembershipMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

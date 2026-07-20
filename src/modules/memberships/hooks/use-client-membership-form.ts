"use client";

import { useActionState, useRef } from "react";

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
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const wrappedAction = async (
    state: ClientMembershipMutationState,
    formData: FormData,
  ): Promise<ClientMembershipMutationState> => {
    formData.set("idempotencyKey", idempotencyKeyRef.current);

    const nextState = await action(state, formData);

    if (nextState.success) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }

    return nextState;
  };

  const [state, formAction, pending] = useActionState(wrappedAction, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

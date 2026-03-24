"use client";

import { useActionState } from "react";

import type { MembershipPlanMutationState } from "@/modules/memberships/types";

const initialState: MembershipPlanMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function useMembershipPlanForm(
  action: (
    state: MembershipPlanMutationState,
    formData: FormData,
  ) => Promise<MembershipPlanMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

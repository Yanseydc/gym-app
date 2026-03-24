"use client";

import { useActionState } from "react";

import type { PaymentMutationState } from "@/modules/payments/types";

const initialState: PaymentMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function usePaymentForm(
  action: (
    state: PaymentMutationState,
    formData: FormData,
  ) => Promise<PaymentMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

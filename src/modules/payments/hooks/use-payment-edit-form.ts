"use client";

import { useActionState } from "react";

import type { PaymentEditMutationState } from "@/modules/payments/types";

const initialState: PaymentEditMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function usePaymentEditForm(
  action: (
    state: PaymentEditMutationState,
    formData: FormData,
  ) => Promise<PaymentEditMutationState>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

"use client";

import { useActionState } from "react";

import type { SignInState } from "@/modules/auth/types";
import { signIn } from "@/modules/auth/services/sign-in";

const initialState: SignInState = {
  error: undefined,
};

export function useLoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return {
    state,
    formAction,
    pending,
  };
}

"use client";

import { useActionState, useEffect, useState } from "react";

import { buttonSecondary } from "@/lib/ui";
import type { ResendPortalAccessMutationState } from "@/modules/coaching/types";

type ResendPortalAccessButtonProps = {
  action: (
    state: ResendPortalAccessMutationState,
  ) => Promise<ResendPortalAccessMutationState>;
};

const initialState: ResendPortalAccessMutationState = {};

export function ResendPortalAccessButton({ action }: ResendPortalAccessButtonProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [coolingDown, setCoolingDown] = useState(false);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setCoolingDown(true);
    const timeoutId = window.setTimeout(() => {
      setCoolingDown(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.success]);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8, justifyItems: "start" }}>
      <button type="submit" disabled={pending || coolingDown} className={buttonSecondary}>
        {pending ? "Enviando..." : "Reenviar acceso"}
      </button>

      {state.success ? (
        <p
          style={{
            margin: 0,
            padding: "8px 10px",
            borderRadius: 10,
            background: "var(--success-bg)",
            color: "var(--success)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {state.success}
        </p>
      ) : null}

      {state.error ? (
        <p
          style={{
            margin: 0,
            padding: "8px 10px",
            borderRadius: 10,
            background: "var(--danger-bg)",
            color: "var(--danger-fg)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

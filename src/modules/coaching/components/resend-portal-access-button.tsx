"use client";

import { useActionState, useEffect, useState } from "react";

import { buttonSecondary } from "@/lib/ui";
import type { ResendPortalAccessMutationState } from "@/modules/coaching/types";

type ResendPortalAccessButtonProps = {
  action: (
    state: ResendPortalAccessMutationState,
  ) => Promise<ResendPortalAccessMutationState>;
  initialCooldownRemainingSeconds: number;
};

const initialState: ResendPortalAccessMutationState = {};

export function ResendPortalAccessButton({
  action,
  initialCooldownRemainingSeconds,
}: ResendPortalAccessButtonProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(
    Math.max(0, initialCooldownRemainingSeconds),
  );

  useEffect(() => {
    setCooldownRemainingSeconds(Math.max(0, initialCooldownRemainingSeconds));
  }, [initialCooldownRemainingSeconds]);

  useEffect(() => {
    if (typeof state.cooldownRemainingSeconds !== "number") {
      return;
    }

    setCooldownRemainingSeconds(Math.max(0, state.cooldownRemainingSeconds));
  }, [state.cooldownRemainingSeconds]);

  useEffect(() => {
    if (cooldownRemainingSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCooldownRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cooldownRemainingSeconds]);

  const isCoolingDown = cooldownRemainingSeconds > 0;

  return (
    <form action={formAction} style={{ display: "grid", gap: 8, justifyItems: "start" }}>
      <button type="submit" disabled={pending || isCoolingDown} className={buttonSecondary}>
        {pending ? "Enviando..." : "Reenviar acceso"}
      </button>

      {isCoolingDown ? (
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
          Podrás reenviar en {cooldownRemainingSeconds} segundos.
        </p>
      ) : null}

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

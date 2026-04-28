"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { buttonSecondary } from "@/lib/ui";
import type { ResendPortalAccessMutationState } from "@/modules/coaching/types";

type ResendPortalAccessButtonProps = {
  action: (
    state: ResendPortalAccessMutationState,
  ) => Promise<ResendPortalAccessMutationState>;
  lastSentAt?: string | null;
};

const initialState: ResendPortalAccessMutationState = {};
const resendCooldownMs = 15 * 60 * 1000;

export function ResendPortalAccessButton({ action, lastSentAt }: ResendPortalAccessButtonProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [now, setNow] = useState(() => Date.now());

  const initialNextAllowedAt = useMemo(() => {
    if (!lastSentAt) {
      return null;
    }

    const lastSentTime = Date.parse(lastSentAt);
    return Number.isNaN(lastSentTime)
      ? null
      : new Date(lastSentTime + resendCooldownMs).toISOString();
  }, [lastSentAt]);

  const nextAllowedAt = state.nextAllowedAt ?? initialNextAllowedAt;
  const nextAllowedTime = nextAllowedAt ? Date.parse(nextAllowedAt) : Number.NaN;
  const cooldownMs = Number.isNaN(nextAllowedTime)
    ? 0
    : Math.max(0, nextAllowedTime - now);
  const cooldownMinutes = Math.max(1, Math.ceil(cooldownMs / 60000));
  const isCoolingDown = cooldownMs > 0;

  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCoolingDown]);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8, justifyItems: "start" }}>
      <button type="submit" disabled={pending || isCoolingDown} className={buttonSecondary}>
        {pending ? "Enviando..." : "Reenviar acceso"}
      </button>

      {isCoolingDown ? (
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
          Podrás reenviar en {cooldownMinutes} minutos.
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

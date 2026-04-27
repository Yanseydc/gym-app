"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, input } from "@/lib/ui";
import { usePortalAccessForm } from "@/modules/coaching/hooks/use-portal-access-form";
import type { PortalAccessMutationState } from "@/modules/coaching/types";

type PortalAccessFormProps = {
  action: (
    state: PortalAccessMutationState,
    formData: FormData,
  ) => Promise<PortalAccessMutationState>;
};

export function PortalAccessForm({ action }: PortalAccessFormProps) {
  const { state, formAction, pending } = usePortalAccessForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Portal user email</span>
        <input
          name="email"
          type="email"
          placeholder="client@example.com"
          className={input}
        />
        {state.fieldErrors?.email ? <FieldError message={state.fieldErrors.email} /> : null}
      </label>

      {state.error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--danger-bg)",
            color: "var(--danger-fg)",
          }}
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={buttonPrimary}
        style={{ width: "fit-content" }}
      >
        {pending ? "Linking..." : "Link portal user"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "var(--danger-fg)", fontSize: 14 }}>{message}</span>;
}

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

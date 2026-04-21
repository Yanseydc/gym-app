"use client";

import type { CSSProperties } from "react";

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
          placeholder="member@example.com"
          style={inputStyles}
        />
        {state.fieldErrors?.email ? <FieldError message={state.fieldErrors.email} /> : null}
      </label>

      {state.error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fbe4e4",
            color: "#8a1c1c",
          }}
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        style={{
          width: "fit-content",
          border: 0,
          padding: "14px 18px",
          borderRadius: 14,
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {pending ? "Linking..." : "Link portal user"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "#8a1c1c", fontSize: 14 }}>{message}</span>;
}

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

const inputStyles: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  font: "inherit",
};

"use client";

import type { CSSProperties } from "react";

import { useCheckInForm } from "@/modules/checkins/hooks/use-checkin-form";
import type { CheckInMutationState } from "@/modules/checkins/types";

type CheckInFormProps = {
  action: (
    state: CheckInMutationState,
    formData: FormData,
  ) => Promise<CheckInMutationState>;
};

export function CheckInForm({ action }: CheckInFormProps) {
  const { state, formAction, pending } = useCheckInForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Notes</span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Optional reception notes"
          style={{ ...inputStyles, resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? (
          <span style={{ color: "#8a1c1c", fontSize: 14 }}>{state.fieldErrors.notes}</span>
        ) : null}
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
        {pending ? "Registering..." : "Register check-in"}
      </button>
    </form>
  );
}

const inputStyles: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  font: "inherit",
};

"use client";

import type { CSSProperties } from "react";

import { useRoutineDayForm } from "@/modules/coaching/hooks/use-routine-day-form";
import type { RoutineDayMutationState } from "@/modules/coaching/types";

type RoutineDayFormProps = {
  action: (
    state: RoutineDayMutationState,
    formData: FormData,
  ) => Promise<RoutineDayMutationState>;
};

export function RoutineDayForm({ action }: RoutineDayFormProps) {
  const { state, formAction, pending } = useRoutineDayForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <div style={gridStyles}>
        <Field
          label="Day order"
          name="dayIndex"
          type="number"
          error={state.fieldErrors?.dayIndex}
        />
        <Field label="Title" name="title" error={state.fieldErrors?.title} />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Notes</span>
        <textarea
          name="notes"
          rows={3}
          style={{ ...inputStyles, resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
      </label>

      {state.error ? (
        <p style={errorStyles}>{state.error}</p>
      ) : null}

      <button type="submit" disabled={pending} style={buttonStyles}>
        {pending ? "Adding..." : "Add day"}
      </button>
    </form>
  );
}

function Field({
  error,
  label,
  name,
  type = "text",
}: {
  error?: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <input name={name} type={type} style={inputStyles} />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "#8a1c1c", fontSize: 14 }}>{message}</span>;
}

const gridStyles: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

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

const buttonStyles: CSSProperties = {
  width: "fit-content",
  border: 0,
  padding: "12px 16px",
  borderRadius: 14,
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const errorStyles: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#fbe4e4",
  color: "#8a1c1c",
};

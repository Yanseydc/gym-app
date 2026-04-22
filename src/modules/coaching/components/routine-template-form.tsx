"use client";

import { useRoutineTemplateForm } from "@/modules/coaching/hooks/use-routine-template-form";
import type { RoutineTemplateFormValues, RoutineTemplateMutationState } from "@/modules/coaching/types";

type RoutineTemplateFormProps = {
  action: (
    state: RoutineTemplateMutationState,
    formData: FormData,
  ) => Promise<RoutineTemplateMutationState>;
  defaultValues: RoutineTemplateFormValues;
  submitLabel: string;
};

export function RoutineTemplateForm({
  action,
  defaultValues,
  submitLabel,
}: RoutineTemplateFormProps) {
  const { state, formAction, pending } = useRoutineTemplateForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Title</span>
        <input name="title" defaultValue={defaultValues.title} style={inputStyles} />
        {state.fieldErrors?.title ? <FieldError message={state.fieldErrors.title} /> : null}
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Notes</span>
        <textarea
          name="notes"
          rows={6}
          defaultValue={defaultValues.notes}
          style={{ ...inputStyles, resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
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
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "#8a1c1c", fontSize: 14 }}>{message}</span>;
}

const labelStyles = {
  fontWeight: 600,
} as const;

const inputStyles = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  font: "inherit",
} as const;

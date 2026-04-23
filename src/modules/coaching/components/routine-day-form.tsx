"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, input } from "@/lib/ui";
import { useRoutineDayForm } from "@/modules/coaching/hooks/use-routine-day-form";
import type { RoutineDayFormValues, RoutineDayMutationState } from "@/modules/coaching/types";

type RoutineDayFormProps = {
  action: (
    state: RoutineDayMutationState,
    formData: FormData,
  ) => Promise<RoutineDayMutationState>;
  defaultValues?: Partial<RoutineDayFormValues>;
  hiddenFields?: Record<string, string>;
  showDayIndex?: boolean;
  submitLabel?: string;
};

export function RoutineDayForm({
  action,
  defaultValues,
  hiddenFields,
  showDayIndex = true,
  submitLabel = "Add day",
}: RoutineDayFormProps) {
  const { state, formAction, pending } = useRoutineDayForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} defaultValue={value} />
          ))
        : null}
      <div style={gridStyles}>
        {showDayIndex ? (
          <Field
            label="Day order"
            name="dayIndex"
            type="number"
            defaultValue={defaultValues?.dayIndex ? String(defaultValues.dayIndex) : ""}
            error={state.fieldErrors?.dayIndex}
          />
        ) : (
          <input
            type="hidden"
            name="dayIndex"
            defaultValue={defaultValues?.dayIndex ? String(defaultValues.dayIndex) : ""}
          />
        )}
        <Field
          label="Title"
          name="title"
          defaultValue={defaultValues?.title ?? ""}
          error={state.fieldErrors?.title}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className={input}
          style={{ resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
      </label>

      {state.error ? (
        <p style={errorStyles}>{state.error}</p>
      ) : null}

      <button type="submit" disabled={pending} className={buttonPrimary} style={{ width: "fit-content" }}>
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  defaultValue,
  error,
  label,
  name,
  type = "text",
}: {
  defaultValue?: string;
  error?: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className={input} />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "var(--danger-fg)", fontSize: 14 }}>{message}</span>;
}

const gridStyles: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

const errorStyles: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  borderRadius: 12,
  background: "var(--danger-bg)",
  color: "var(--danger-fg)",
};

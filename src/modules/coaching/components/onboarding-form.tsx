"use client";

import type { CSSProperties } from "react";

import { useOnboardingForm } from "@/modules/coaching/hooks/use-onboarding-form";
import type {
  ClientOnboardingFormValues,
  ClientOnboardingMutationState,
} from "@/modules/coaching/types";

type OnboardingFormProps = {
  action: (
    state: ClientOnboardingMutationState,
    formData: FormData,
  ) => Promise<ClientOnboardingMutationState>;
  defaultValues?: ClientOnboardingFormValues;
  submitLabel: string;
};

const emptyValues: ClientOnboardingFormValues = {
  weightKg: 0,
  heightCm: 0,
  goal: "",
  availableDays: 3,
  availableSchedule: "",
  injuriesNotes: "",
  experienceLevel: "beginner",
  notes: "",
};

export function OnboardingForm({
  action,
  defaultValues = emptyValues,
  submitLabel,
}: OnboardingFormProps) {
  const { state, formAction, pending } = useOnboardingForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div style={gridStyles}>
        <Field
          label="Weight (kg)"
          name="weightKg"
          type="number"
          step="0.01"
          defaultValue={String(defaultValues.weightKg || "")}
          error={state.fieldErrors?.weightKg}
        />
        <Field
          label="Height (cm)"
          name="heightCm"
          type="number"
          defaultValue={String(defaultValues.heightCm || "")}
          error={state.fieldErrors?.heightCm}
        />
        <Field
          label="Available days"
          name="availableDays"
          type="number"
          defaultValue={String(defaultValues.availableDays)}
          error={state.fieldErrors?.availableDays}
        />

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>Experience level</span>
          <select
            name="experienceLevel"
            defaultValue={defaultValues.experienceLevel}
            style={inputStyles}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          {state.fieldErrors?.experienceLevel ? (
            <FieldError message={state.fieldErrors.experienceLevel} />
          ) : null}
        </label>
      </div>

      <TextAreaField
        label="Goal"
        name="goal"
        rows={3}
        defaultValue={defaultValues.goal}
        error={state.fieldErrors?.goal}
      />
      <TextAreaField
        label="Available schedule"
        name="availableSchedule"
        rows={3}
        defaultValue={defaultValues.availableSchedule}
        error={state.fieldErrors?.availableSchedule}
      />
      <TextAreaField
        label="Injuries notes"
        name="injuriesNotes"
        rows={3}
        defaultValue={defaultValues.injuriesNotes}
        error={state.fieldErrors?.injuriesNotes}
      />
      <TextAreaField
        label="Notes"
        name="notes"
        rows={4}
        defaultValue={defaultValues.notes}
        error={state.fieldErrors?.notes}
      />

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
        style={{
          width: "fit-content",
          border: 0,
          padding: "14px 18px",
          borderRadius: 14,
          background: "var(--accent)",
          color: "#121513",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
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
  step,
  type = "text",
}: {
  defaultValue: string;
  error?: string;
  label: string;
  name: string;
  step?: string;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        style={inputStyles}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function TextAreaField({
  defaultValue,
  error,
  label,
  name,
  rows,
}: {
  defaultValue: string;
  error?: string;
  label: string;
  name: string;
  rows: number;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        style={{ ...inputStyles, resize: "vertical" }}
      />
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

const inputStyles: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--input)",
  font: "inherit",
};

"use client";

import type { CSSProperties } from "react";

import { useExerciseForm } from "@/modules/coaching/hooks/use-exercise-form";
import type { ExerciseFormValues, ExerciseMutationState } from "@/modules/coaching/types";

type ExerciseFormProps = {
  action: (
    state: ExerciseMutationState,
    formData: FormData,
  ) => Promise<ExerciseMutationState>;
  defaultValues?: ExerciseFormValues;
  submitLabel: string;
};

const emptyValues: ExerciseFormValues = {
  name: "",
  slug: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  primaryMuscle: "",
  secondaryMuscle: "",
  equipment: "",
  difficulty: "",
  instructions: "",
  coachTips: "",
  commonMistakes: "",
  isActive: true,
};

export function ExerciseForm({
  action,
  defaultValues = emptyValues,
  submitLabel,
}: ExerciseFormProps) {
  const { state, formAction, pending } = useExerciseForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div style={gridStyles}>
        <Field
          label="Name"
          name="name"
          defaultValue={defaultValues.name}
          error={state.fieldErrors?.name}
        />
        <Field
          label="Slug"
          name="slug"
          defaultValue={defaultValues.slug}
          error={state.fieldErrors?.slug}
        />
        <Field
          label="Video URL"
          name="videoUrl"
          type="url"
          defaultValue={defaultValues.videoUrl}
          error={state.fieldErrors?.videoUrl}
        />
        <Field
          label="Thumbnail URL"
          name="thumbnailUrl"
          type="url"
          defaultValue={defaultValues.thumbnailUrl}
          error={state.fieldErrors?.thumbnailUrl}
        />
        <Field
          label="Primary muscle"
          name="primaryMuscle"
          defaultValue={defaultValues.primaryMuscle}
          error={state.fieldErrors?.primaryMuscle}
        />
        <Field
          label="Secondary muscle"
          name="secondaryMuscle"
          defaultValue={defaultValues.secondaryMuscle}
          error={state.fieldErrors?.secondaryMuscle}
        />
        <Field
          label="Equipment"
          name="equipment"
          defaultValue={defaultValues.equipment}
          error={state.fieldErrors?.equipment}
        />

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>Difficulty</span>
          <select name="difficulty" defaultValue={defaultValues.difficulty} style={inputStyles}>
            <option value="">Not specified</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          {state.fieldErrors?.difficulty ? (
            <FieldError message={state.fieldErrors.difficulty} />
          ) : null}
        </label>
      </div>

      <TextAreaField
        label="Description"
        name="description"
        rows={4}
        defaultValue={defaultValues.description}
        error={state.fieldErrors?.description}
      />
      <TextAreaField
        label="Instructions"
        name="instructions"
        rows={5}
        defaultValue={defaultValues.instructions}
        error={state.fieldErrors?.instructions}
      />
      <TextAreaField
        label="Coach tips"
        name="coachTips"
        rows={4}
        defaultValue={defaultValues.coachTips}
        error={state.fieldErrors?.coachTips}
      />
      <TextAreaField
        label="Common mistakes"
        name="commonMistakes"
        rows={4}
        defaultValue={defaultValues.commonMistakes}
        error={state.fieldErrors?.commonMistakes}
      />

      <label
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: 16,
          borderRadius: 16,
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border)",
        }}
      >
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={defaultValues.isActive}
        />
        <span style={labelStyles}>Exercise is active</span>
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

type FieldProps = {
  defaultValue: string;
  error?: string;
  label: string;
  name: string;
  type?: string;
};

function Field({ defaultValue, error, label, name, type = "text" }: FieldProps) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} style={inputStyles} />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

type TextAreaFieldProps = {
  defaultValue: string;
  error?: string;
  label: string;
  name: string;
  rows: number;
};

function TextAreaField({ defaultValue, error, label, name, rows }: TextAreaFieldProps) {
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

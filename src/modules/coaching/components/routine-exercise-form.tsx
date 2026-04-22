"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, input } from "@/lib/ui";
import { useRoutineExerciseForm } from "@/modules/coaching/hooks/use-routine-exercise-form";
import type { RoutineExerciseMutationState, RoutineExerciseOption } from "@/modules/coaching/types";

type RoutineExerciseFormProps = {
  action: (
    state: RoutineExerciseMutationState,
    formData: FormData,
  ) => Promise<RoutineExerciseMutationState>;
  exercises: RoutineExerciseOption[];
};

export function RoutineExerciseForm({ action, exercises }: RoutineExerciseFormProps) {
  const { state, formAction, pending } = useRoutineExerciseForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <div style={gridStyles}>
        <label style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
          <span style={labelStyles}>Exercise</span>
          <select name="exerciseId" defaultValue="" className={input}>
            <option value="">Select an exercise</option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.exerciseId ? (
            <FieldError message={state.fieldErrors.exerciseId} />
          ) : null}
        </label>

        <Field
          label="Sort order"
          name="sortOrder"
          type="number"
          error={state.fieldErrors?.sortOrder}
        />
        <Field label="Sets" name="setsText" error={state.fieldErrors?.setsText} />
        <Field label="Reps" name="repsText" error={state.fieldErrors?.repsText} />
        <Field
          label="Target weight"
          name="targetWeightText"
          error={state.fieldErrors?.targetWeightText}
        />
        <Field
          label="Rest seconds"
          name="restSeconds"
          type="number"
          error={state.fieldErrors?.restSeconds}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Notes</span>
        <textarea name="notes" rows={3} className={input} style={{ resize: "vertical" }} />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
      </label>

      {state.error ? <p style={errorStyles}>{state.error}</p> : null}

      <button type="submit" disabled={pending} className={buttonPrimary} style={{ width: "fit-content" }}>
        {pending ? "Adding..." : "Add exercise"}
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
      <input name={name} type={type} className={input} />
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

"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { buttonGhost, buttonPrimary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { useRoutineExerciseForm } from "@/modules/coaching/hooks/use-routine-exercise-form";
import type {
  RoutineExerciseFormValues,
  RoutineExerciseMutationState,
  RoutineExerciseOption,
} from "@/modules/coaching/types";

type RoutineExerciseFormProps = {
  action: (
    state: RoutineExerciseMutationState,
    formData: FormData,
  ) => Promise<RoutineExerciseMutationState>;
  defaultValues?: Partial<RoutineExerciseFormValues>;
  exercises: RoutineExerciseOption[];
  hiddenFields?: Record<string, string>;
  onCancel?: (() => void) | undefined;
  onSuccess?: ((values: RoutineExerciseFormValues, result: RoutineExerciseMutationState) => void) | undefined;
  showSortOrder?: boolean;
  submitLabel?: string;
};

export function RoutineExerciseForm({
  action,
  defaultValues,
  exercises,
  hiddenFields,
  onCancel,
  onSuccess,
  showSortOrder = true,
  submitLabel = "Add exercise",
}: RoutineExerciseFormProps) {
  const { t } = useAdminText();
  const submittedValuesRef = useRef<RoutineExerciseFormValues | null>(null);
  const handledSuccessRef = useRef(false);
  const wrappedAction = useMemo(
    () => async (state: RoutineExerciseMutationState, formData: FormData) => {
      submittedValuesRef.current = {
        exerciseId: String(formData.get("exerciseId") ?? ""),
        sortOrder: Number(formData.get("sortOrder") ?? defaultValues?.sortOrder ?? 0),
        setsText: String(formData.get("setsText") ?? ""),
        repsText: String(formData.get("repsText") ?? ""),
        targetWeightText: String(formData.get("targetWeightText") ?? ""),
        restSeconds: String(formData.get("restSeconds") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      };
      handledSuccessRef.current = false;
      return action(state, formData);
    },
    [action, defaultValues?.sortOrder],
  );
  const { state, formAction, pending } = useRoutineExerciseForm(wrappedAction);
  const resolvedSubmitLabel = submitLabel ?? t("coaching.routines.addExerciseAction");

  useEffect(() => {
    if (!onSuccess || pending || handledSuccessRef.current || state.error || !submittedValuesRef.current) {
      return;
    }

    handledSuccessRef.current = true;
    onSuccess(submittedValuesRef.current, state);
  }, [onSuccess, pending, state]);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} defaultValue={value} />
          ))
        : null}
      <div style={gridStyles}>
        <label style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
          <span style={labelStyles}>{t("coaching.routines.exerciseLabel")}</span>
          <select name="exerciseId" defaultValue={defaultValues?.exerciseId ?? ""} className={input}>
            <option value="">{t("coaching.routines.selectExercise")}</option>
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

        {showSortOrder ? (
          <Field
            label={t("coaching.routines.sortOrder")}
            name="sortOrder"
            type="number"
            defaultValue={defaultValues?.sortOrder ? String(defaultValues.sortOrder) : ""}
            error={state.fieldErrors?.sortOrder}
          />
        ) : defaultValues?.sortOrder ? (
          <input type="hidden" name="sortOrder" defaultValue={String(defaultValues.sortOrder)} />
        ) : null}
        <Field
          label={t("coaching.routines.sets")}
          name="setsText"
          defaultValue={defaultValues?.setsText ?? ""}
          error={state.fieldErrors?.setsText}
        />
        <Field
          label={t("coaching.routines.reps")}
          name="repsText"
          defaultValue={defaultValues?.repsText ?? ""}
          error={state.fieldErrors?.repsText}
        />
        <Field
          label={t("coaching.routines.targetWeight")}
          name="targetWeightText"
          defaultValue={defaultValues?.targetWeightText ?? ""}
          error={state.fieldErrors?.targetWeightText}
        />
        <Field
          label={t("coaching.routines.restSeconds")}
          name="restSeconds"
          type="number"
          defaultValue={defaultValues?.restSeconds ?? ""}
          error={state.fieldErrors?.restSeconds}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t("common.notes")}</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className={input}
          style={{ resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
      </label>

      {state.error ? <p style={errorStyles}>{state.error}</p> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" disabled={pending} className={buttonPrimary} style={{ width: "fit-content" }}>
          {pending ? t("common.saving") : resolvedSubmitLabel}
        </button>
        {onCancel ? (
          <button type="button" className={buttonGhost} onClick={onCancel}>
            {t("common.cancel")}
          </button>
        ) : null}
      </div>
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

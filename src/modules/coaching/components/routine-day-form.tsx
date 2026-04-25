"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { buttonGhost, buttonPrimary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { useRoutineDayForm } from "@/modules/coaching/hooks/use-routine-day-form";
import type { RoutineDayFormValues, RoutineDayMutationState } from "@/modules/coaching/types";

type RoutineDayFormProps = {
  action: (
    state: RoutineDayMutationState,
    formData: FormData,
  ) => Promise<RoutineDayMutationState>;
  defaultValues?: Partial<RoutineDayFormValues>;
  hiddenFields?: Record<string, string>;
  onCancel?: (() => void) | undefined;
  onSuccess?: ((values: RoutineDayFormValues) => void) | undefined;
  showDayIndex?: boolean;
  submitLabel?: string;
};

export function RoutineDayForm({
  action,
  defaultValues,
  hiddenFields,
  onCancel,
  onSuccess,
  showDayIndex = true,
  submitLabel = "Add day",
}: RoutineDayFormProps) {
  const { t } = useAdminText();
  const submittedValuesRef = useRef<RoutineDayFormValues | null>(null);
  const handledSuccessRef = useRef(false);
  const wrappedAction = useMemo(
    () => async (state: RoutineDayMutationState, formData: FormData) => {
      submittedValuesRef.current = {
        dayIndex: Number(formData.get("dayIndex") ?? defaultValues?.dayIndex ?? 0),
        title: String(formData.get("title") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      };
      handledSuccessRef.current = false;
      return action(state, formData);
    },
    [action, defaultValues?.dayIndex],
  );
  const { state, formAction, pending } = useRoutineDayForm(wrappedAction);
  const resolvedSubmitLabel = submitLabel ?? t("coaching.routines.addDayAction");

  useEffect(() => {
    if (!onSuccess || pending || handledSuccessRef.current || state.error || !submittedValuesRef.current) {
      return;
    }

    handledSuccessRef.current = true;
    onSuccess(submittedValuesRef.current);
  }, [onSuccess, pending, state.error]);

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
            label={t("coaching.routines.dayOrder")}
            name="dayIndex"
            type="number"
            defaultValue={defaultValues?.dayIndex ? String(defaultValues.dayIndex) : ""}
            error={state.fieldErrors?.dayIndex}
          />
        ) : defaultValues?.dayIndex ? (
          <input
            type="hidden"
            name="dayIndex"
            defaultValue={String(defaultValues.dayIndex)}
          />
        ) : null}
        <Field
          label={t("common.title")}
          name="title"
          defaultValue={defaultValues?.title ?? ""}
          error={state.fieldErrors?.title}
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

      {state.error ? (
        <p style={errorStyles}>{state.error}</p>
      ) : null}

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

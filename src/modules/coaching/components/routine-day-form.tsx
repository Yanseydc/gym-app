"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, input } from "@/lib/ui";
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
  const { t } = useAdminText();
  const { state, formAction, pending } = useRoutineDayForm(action);
  const resolvedSubmitLabel = submitLabel ?? t("coaching.routines.addDayAction");

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

      <button type="submit" disabled={pending} className={buttonPrimary} style={{ width: "fit-content" }}>
        {pending ? t("common.saving") : resolvedSubmitLabel}
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

"use client";

import { getTextForLocale } from "@/lib/i18n";
import { buttonPrimary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
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
  const { locale } = useAdminText();
  const t = getTextForLocale("coaching", locale);
  const common = getTextForLocale("common", locale);
  const { state, formAction, pending } = useRoutineTemplateForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t.templates.title}</span>
        <input name="title" defaultValue={defaultValues.title} className={input} />
        {state.fieldErrors?.title ? <FieldError message={state.fieldErrors.title} /> : null}
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t.templates.notes}</span>
        <textarea
          name="notes"
          rows={6}
          defaultValue={defaultValues.notes}
          className={input}
          style={{ resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
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
        className={buttonPrimary}
        style={{ width: "fit-content" }}
      >
        {pending ? common.saving : submitLabel}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "var(--danger-fg)", fontSize: 14 }}>{message}</span>;
}

const labelStyles = {
  fontWeight: 600,
} as const;

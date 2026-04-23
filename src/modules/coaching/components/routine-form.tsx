"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { useRoutineForm } from "@/modules/coaching/hooks/use-routine-form";
import type {
  RoutineClientOption,
  RoutineFormValues,
  RoutineMutationState,
} from "@/modules/coaching/types";

type RoutineFormProps = {
  action: (
    state: RoutineMutationState,
    formData: FormData,
  ) => Promise<RoutineMutationState>;
  clients: RoutineClientOption[];
  defaultValues?: RoutineFormValues;
  submitLabel: string;
  lockClient?: boolean;
  showHeader?: boolean;
};

const emptyValues: RoutineFormValues = {
  clientId: "",
  title: "",
  notes: "",
  status: "draft",
  startsOn: "",
  endsOn: "",
};

export function RoutineForm({
  action,
  clients,
  defaultValues = emptyValues,
  submitLabel,
  lockClient = false,
  showHeader = true,
}: RoutineFormProps) {
  const { t } = useAdminText();
  const { state, formAction, pending } = useRoutineForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      {showHeader ? (
        <div
          style={{
            display: "grid",
            gap: 6,
            paddingBottom: 6,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <strong style={{ fontSize: 18 }}>{t("coaching.routines.overview")}</strong>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {t("clients.detail.routinesHelper")}
          </p>
        </div>
      ) : null}

      <div style={gridStyles}>
        {!lockClient ? (
          <label style={{ display: "grid", gap: 8 }}>
            <span style={labelStyles}>{t("payments.form.client")}</span>
            <select name="clientId" defaultValue={defaultValues.clientId} className={input}>
              <option value="">{t("payments.form.selectClient")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
            {state.fieldErrors?.clientId ? <FieldError message={state.fieldErrors.clientId} /> : null}
          </label>
        ) : (
          <input type="hidden" name="clientId" value={defaultValues.clientId} />
        )}

        <Field
          label={t("common.title")}
          name="title"
          defaultValue={defaultValues.title}
          error={state.fieldErrors?.title}
        />

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>{t("clients.form.status")}</span>
          <select name="status" defaultValue={defaultValues.status} className={input}>
            <option value="draft">{t("common.status.draft")}</option>
            <option value="active">{t("common.status.active")}</option>
            <option value="archived">{t("common.status.archived")}</option>
          </select>
          {state.fieldErrors?.status ? <FieldError message={state.fieldErrors.status} /> : null}
        </label>

        <Field
          label={t("coaching.routines.startsOn")}
          name="startsOn"
          type="date"
          defaultValue={defaultValues.startsOn}
          error={state.fieldErrors?.startsOn}
        />

        <Field
          label={t("coaching.routines.endsOn")}
          name="endsOn"
          type="date"
          defaultValue={defaultValues.endsOn}
          error={state.fieldErrors?.endsOn}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t("clients.detail.notes")}</span>
        <textarea
          name="notes"
          rows={5}
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
        {pending ? t("common.saving") : submitLabel}
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
  defaultValue: string;
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

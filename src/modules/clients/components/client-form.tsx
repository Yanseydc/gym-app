"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { useClientForm } from "@/modules/clients/hooks/use-client-form";
import type { ClientFormValues, ClientMutationState } from "@/modules/clients/types";

type ClientFormProps = {
  action: (
    state: ClientMutationState,
    formData: FormData,
  ) => Promise<ClientMutationState>;
  defaultValues?: ClientFormValues;
  submitLabel: string;
};

const emptyValues: ClientFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  status: "active",
  notes: "",
};

export function ClientForm({
  action,
  defaultValues = emptyValues,
  submitLabel,
}: ClientFormProps) {
  const { t } = useAdminText();
  const { state, formAction, pending } = useClientForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div className="responsive-meta-grid" style={gridStyles}>
        <Field
          label={t("clients.form.firstName")}
          name="firstName"
          defaultValue={defaultValues.firstName}
          error={state.fieldErrors?.firstName}
        />
        <Field
          label={t("clients.form.lastName")}
          name="lastName"
          defaultValue={defaultValues.lastName}
          error={state.fieldErrors?.lastName}
        />
        <Field
          label={t("clients.form.phone")}
          name="phone"
          defaultValue={defaultValues.phone}
          error={state.fieldErrors?.phone}
        />
        <Field
          label={t("clients.form.email")}
          name="email"
          type="email"
          defaultValue={defaultValues.email}
          error={state.fieldErrors?.email}
        />

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>{t("clients.form.status")}</span>
          <select
            name="status"
            defaultValue={defaultValues.status}
            className={input}
          >
            <option value="active">{t("common.status.active")}</option>
            <option value="inactive">{t("common.status.inactive")}</option>
          </select>
          {state.fieldErrors?.status ? <FieldError message={state.fieldErrors.status} /> : null}
        </label>
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t("clients.form.notes")}</span>
        <textarea
          name="notes"
          defaultValue={defaultValues.notes}
          rows={5}
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
        style={{ width: "fit-content", maxWidth: "100%" }}
      >
        {pending ? t("common.saving") : submitLabel}
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
};

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

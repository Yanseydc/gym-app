"use client";

import type { CSSProperties } from "react";

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
  const { state, formAction, pending } = useClientForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div style={gridStyles}>
        <Field
          label="First name"
          name="firstName"
          defaultValue={defaultValues.firstName}
          error={state.fieldErrors?.firstName}
        />
        <Field
          label="Last name"
          name="lastName"
          defaultValue={defaultValues.lastName}
          error={state.fieldErrors?.lastName}
        />
        <Field
          label="Phone"
          name="phone"
          defaultValue={defaultValues.phone}
          error={state.fieldErrors?.phone}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={defaultValues.email}
          error={state.fieldErrors?.email}
        />

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>Status</span>
          <select
            name="status"
            defaultValue={defaultValues.status}
            style={inputStyles}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {state.fieldErrors?.status ? <FieldError message={state.fieldErrors.status} /> : null}
        </label>
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Notes</span>
        <textarea
          name="notes"
          defaultValue={defaultValues.notes}
          rows={5}
          style={{ ...inputStyles, resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
      </label>

      {state.error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fbe4e4",
            color: "#8a1c1c",
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
          color: "#fff",
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

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "#8a1c1c", fontSize: 14 }}>{message}</span>;
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
  background: "#fff",
  font: "inherit",
};

"use client";

import type { CSSProperties } from "react";

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
}: RoutineFormProps) {
  const { state, formAction, pending } = useRoutineForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div style={gridStyles}>
        {!lockClient ? (
          <label style={{ display: "grid", gap: 8 }}>
            <span style={labelStyles}>Client</span>
            <select name="clientId" defaultValue={defaultValues.clientId} style={inputStyles}>
              <option value="">Select a client</option>
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
          label="Title"
          name="title"
          defaultValue={defaultValues.title}
          error={state.fieldErrors?.title}
        />

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>Status</span>
          <select name="status" defaultValue={defaultValues.status} style={inputStyles}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          {state.fieldErrors?.status ? <FieldError message={state.fieldErrors.status} /> : null}
        </label>

        <Field
          label="Starts on"
          name="startsOn"
          type="date"
          defaultValue={defaultValues.startsOn}
          error={state.fieldErrors?.startsOn}
        />

        <Field
          label="Ends on"
          name="endsOn"
          type="date"
          defaultValue={defaultValues.endsOn}
          error={state.fieldErrors?.endsOn}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Notes</span>
        <textarea
          name="notes"
          rows={5}
          defaultValue={defaultValues.notes}
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

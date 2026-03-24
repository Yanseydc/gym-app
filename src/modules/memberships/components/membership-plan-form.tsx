"use client";

import type { CSSProperties } from "react";

import { useMembershipPlanForm } from "@/modules/memberships/hooks/use-membership-plan-form";
import type {
  MembershipPlanFormValues,
  MembershipPlanMutationState,
} from "@/modules/memberships/types";

type MembershipPlanFormProps = {
  action: (
    state: MembershipPlanMutationState,
    formData: FormData,
  ) => Promise<MembershipPlanMutationState>;
  defaultValues?: MembershipPlanFormValues;
  submitLabel: string;
};

const emptyValues: MembershipPlanFormValues = {
  name: "",
  durationInDays: 30,
  price: 0,
  description: "",
  isActive: true,
};

export function MembershipPlanForm({
  action,
  defaultValues = emptyValues,
  submitLabel,
}: MembershipPlanFormProps) {
  const { state, formAction, pending } = useMembershipPlanForm(action);

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
          label="Duration (days)"
          name="durationInDays"
          type="number"
          defaultValue={String(defaultValues.durationInDays)}
          error={state.fieldErrors?.durationInDays}
        />
        <Field
          label="Price"
          name="price"
          type="number"
          step="0.01"
          defaultValue={String(defaultValues.price)}
          error={state.fieldErrors?.price}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Description</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={defaultValues.description}
          style={{ ...inputStyles, resize: "vertical" }}
        />
        {state.fieldErrors?.description ? (
          <FieldError message={state.fieldErrors.description} />
        ) : null}
      </label>

      <label
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: 16,
          borderRadius: 16,
          background: "rgba(239, 229, 212, 0.45)",
        }}
      >
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={defaultValues.isActive}
        />
        <span style={labelStyles}>Plan is active</span>
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
  step?: string;
  type?: string;
};

function Field({ defaultValue, error, label, name, step, type = "text" }: FieldProps) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        style={inputStyles}
      />
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

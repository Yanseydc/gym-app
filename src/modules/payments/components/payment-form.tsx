"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

import { buttonPrimary, input } from "@/lib/ui";
import { usePaymentForm } from "@/modules/payments/hooks/use-payment-form";
import type {
  PaymentClientOption,
  PaymentFormValues,
  PaymentMembershipOption,
  PaymentMutationState,
} from "@/modules/payments/types";

type PaymentFormProps = {
  action: (
    state: PaymentMutationState,
    formData: FormData,
  ) => Promise<PaymentMutationState>;
  clients: PaymentClientOption[];
  memberships: PaymentMembershipOption[];
  submitLabel: string;
  defaultValues?: Partial<PaymentFormValues>;
  lockClient?: boolean;
};

const today = new Date().toISOString().slice(0, 10);

export function PaymentForm({
  action,
  clients,
  memberships,
  submitLabel,
  defaultValues,
  lockClient = false,
}: PaymentFormProps) {
  const { state, formAction, pending } = usePaymentForm(action);
  const [selectedClientId, setSelectedClientId] = useState(defaultValues?.clientId ?? "");
  const [selectedMembershipId, setSelectedMembershipId] = useState(
    defaultValues?.clientMembershipId ?? "",
  );
  const visibleMemberships = selectedClientId
    ? memberships.filter((membership) => membership.clientId === selectedClientId)
    : [];
  const selectedMembership =
    visibleMemberships.find((membership) => membership.id === selectedMembershipId) ?? null;

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div style={gridStyles}>
        {!lockClient ? (
          <label style={{ display: "grid", gap: 8 }}>
            <span style={labelStyles}>Client</span>
            <select
              name="clientId"
              value={selectedClientId}
              onChange={(event) => {
                setSelectedClientId(event.target.value);
                setSelectedMembershipId("");
              }}
              className={input}
            >
              <option value="">
                Select a client
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
            {state.fieldErrors?.clientId ? <FieldError message={state.fieldErrors.clientId} /> : null}
          </label>
        ) : null}

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>Membership</span>
          <select
            name="clientMembershipId"
            key={selectedClientId || "no-client"}
            value={selectedMembershipId}
            onChange={(event) => {
              setSelectedMembershipId(event.target.value);
            }}
            className={input}
          >
            <option value="">Select a membership</option>
            {visibleMemberships.map((membership) => (
              <option key={membership.id} value={membership.id}>
                {membership.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.clientMembershipId ? (
            <FieldError message={state.fieldErrors.clientMembershipId} />
          ) : null}
          {selectedMembership ? (
            <div
              style={{
                display: "grid",
                gap: 4,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--surface-alt)",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              <span>Plan price: ${selectedMembership.planPrice.toFixed(2)}</span>
              <span>Total paid: ${selectedMembership.totalPaid.toFixed(2)}</span>
              <span>Remaining balance: ${selectedMembership.remainingBalance.toFixed(2)}</span>
            </div>
          ) : null}
        </label>

        <Field
          label="Amount"
          name="amount"
          type="number"
          step="0.01"
          defaultValue={String(defaultValues?.amount ?? "")}
          error={state.fieldErrors?.amount}
        />

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>Payment method</span>
          <select
            name="paymentMethod"
            defaultValue={defaultValues?.paymentMethod ?? "cash"}
            className={input}
          >
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="card">Card</option>
          </select>
          {state.fieldErrors?.paymentMethod ? (
            <FieldError message={state.fieldErrors.paymentMethod} />
          ) : null}
        </label>

        <Field
          label="Payment date"
          name="paymentDate"
          type="date"
          defaultValue={defaultValues?.paymentDate ?? today}
          error={state.fieldErrors?.paymentDate}
        />

        <Field
          label="Concept"
          name="concept"
          defaultValue={defaultValues?.concept ?? ""}
          error={state.fieldErrors?.concept}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Notes</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={defaultValues?.notes ?? ""}
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
        className={input}
      />
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

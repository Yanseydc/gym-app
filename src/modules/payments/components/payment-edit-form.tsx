"use client";

import type { CSSProperties } from "react";

import { usePaymentEditForm } from "@/modules/payments/hooks/use-payment-edit-form";
import type {
  Payment,
  PaymentEditFormValues,
  PaymentEditMutationState,
} from "@/modules/payments/types";

type PaymentEditFormProps = {
  action: (
    state: PaymentEditMutationState,
    formData: FormData,
  ) => Promise<PaymentEditMutationState>;
  defaultValues?: Partial<PaymentEditFormValues>;
  payment: Payment;
};

export function PaymentEditForm({
  action,
  defaultValues,
  payment,
}: PaymentEditFormProps) {
  const { state, formAction, pending } = usePaymentEditForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div style={summaryStyles}>
        <span>Amount: ${payment.amount.toFixed(2)}</span>
        <span>Method: {payment.paymentMethod}</span>
        <span>Date: {payment.paymentDate}</span>
        <span>Membership: {payment.membershipLabel ?? "Not linked"}</span>
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Concept</span>
        <input
          name="concept"
          defaultValue={defaultValues?.concept ?? payment.concept}
          style={inputStyles}
        />
        {state.fieldErrors?.concept ? <FieldError message={state.fieldErrors.concept} /> : null}
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>Notes</span>
        <textarea
          name="notes"
          rows={5}
          defaultValue={defaultValues?.notes ?? payment.notes ?? ""}
          style={{ ...inputStyles, resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
      </label>

      <p
        style={{
          margin: 0,
          color: "var(--muted)",
          fontSize: 14,
        }}
      >
        Amount cannot be edited after the payment is registered.
      </p>

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
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "#8a1c1c", fontSize: 14 }}>{message}</span>;
}

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

const summaryStyles: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "14px 16px",
  borderRadius: 14,
  background: "var(--surface-alt)",
  color: "var(--muted)",
};

"use client";

import type { CSSProperties } from "react";

import { getTextForLocale } from "@/lib/i18n";
import { buttonPrimary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
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
  const { locale } = useAdminText();
  const t = getTextForLocale("payments", locale);
  const common = getTextForLocale("common", locale);
  const { state, formAction, pending } = usePaymentEditForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div style={summaryStyles}>
        <span>{t.summary.amount}: ${payment.amount.toFixed(2)}</span>
        <span>{t.summary.method}: {payment.paymentMethod}</span>
        <span>{t.summary.date}: {payment.paymentDate}</span>
        <span>{t.summary.membership}: {payment.membershipLabel ?? t.notLinked}</span>
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t.form.concept}</span>
        <input
          name="concept"
          defaultValue={defaultValues?.concept ?? payment.concept}
          className={input}
        />
        {state.fieldErrors?.concept ? <FieldError message={state.fieldErrors.concept} /> : null}
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t.form.notes}</span>
        <textarea
          name="notes"
          rows={5}
          defaultValue={defaultValues?.notes ?? payment.notes ?? ""}
          className={input}
          style={{ resize: "vertical" }}
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
        {t.amountLocked}
      </p>

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
        {pending ? common.saving : common.saveChanges}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "var(--danger-fg)", fontSize: 14 }}>{message}</span>;
}

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

const summaryStyles: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "14px 16px",
  borderRadius: 14,
  background: "var(--surface-alt)",
  border: "1px solid var(--border)",
  color: "var(--muted)",
};

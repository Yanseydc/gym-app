"use client";

import { useState, type CSSProperties } from "react";

import { buttonPrimary, fieldError, formError, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { useClientMembershipForm } from "@/modules/memberships/hooks/use-client-membership-form";
import type {
  ClientMembershipMutationState,
  ClientMembershipFormValues,
  MembershipPlan,
} from "@/modules/memberships/types";

type MembershipAssignmentFormProps = {
  action: (
    state: ClientMembershipMutationState,
    formData: FormData,
  ) => Promise<ClientMembershipMutationState>;
  plans: MembershipPlan[];
  warningMessage?: string;
};

const today = new Date().toISOString().slice(0, 10);

const defaultValues: ClientMembershipFormValues = {
  membershipPlanId: "",
  startDate: today,
  notes: "",
  chargeNow: false,
  paymentMethod: "",
  amount: "",
  idempotencyKey: "",
};

const paymentMethodOptions = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "Tarjeta" },
];

export function MembershipAssignmentForm({
  action,
  plans,
  warningMessage,
}: MembershipAssignmentFormProps) {
  const { t } = useAdminText();
  const { state, formAction, pending } = useClientMembershipForm(action);
  const [chargeNow, setChargeNow] = useState(false);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      {warningMessage ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--warning-bg)",
            color: "var(--warning-fg)",
            border: "1px solid color-mix(in srgb, var(--warning-fg) 18%, transparent)",
          }}
        >
          {warningMessage}
        </p>
      ) : null}

      <div style={gridStyles}>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>{t("memberships.form.plan")}</span>
          <select
            name="membershipPlanId"
            defaultValue={defaultValues.membershipPlanId}
            className={input}
          >
            <option value="" disabled>
              {t("memberships.form.selectPlan")}
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {plan.durationInDays} days · ${plan.price.toFixed(2)}
              </option>
            ))}
          </select>
          {state.fieldErrors?.membershipPlanId ? (
            <FieldError message={state.fieldErrors.membershipPlanId} />
          ) : null}
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>{t("memberships.form.startDate")}</span>
          <input
            type="date"
            name="startDate"
            defaultValue={defaultValues.startDate}
            className={input}
          />
          {state.fieldErrors?.startDate ? <FieldError message={state.fieldErrors.startDate} /> : null}
        </label>
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t("memberships.form.notes")}</span>
        <textarea
          name="notes"
          defaultValue={defaultValues.notes}
          rows={4}
          className={input}
          style={{ resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
        <input
          type="checkbox"
          name="chargeNow"
          checked={chargeNow}
          onChange={(event) => setChargeNow(event.target.checked)}
        />
        Cobrar ahora
      </label>

      {chargeNow ? (
        <div style={gridStyles}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={labelStyles}>Método de pago</span>
            <select name="paymentMethod" defaultValue="" className={input}>
              <option value="" disabled>
                Selecciona un método
              </option>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {state.fieldErrors?.paymentMethod ? (
              <FieldError message={state.fieldErrors.paymentMethod} />
            ) : null}
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={labelStyles}>Monto</span>
            <input type="number" name="amount" min="0.01" step="0.01" className={input} />
            {state.fieldErrors?.amount ? <FieldError message={state.fieldErrors.amount} /> : null}
          </label>
        </div>
      ) : null}

      {state.error ? (
        <p className={formError}>
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--warning-bg)",
            color: "var(--warning-fg)",
            border: "1px solid color-mix(in srgb, var(--warning-fg) 18%, transparent)",
            display: "grid",
            gap: 8,
          }}
        >
          <span>{state.success}</span>
          {chargeNow ? null : (
            <a href="#register-payment" style={{ fontWeight: 600, width: "fit-content" }}>
              Registrar pago ahora
            </a>
          )}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || plans.length === 0}
        className={buttonPrimary}
        style={{ width: "fit-content" }}
      >
        {pending ? t("common.saving") : t("memberships.form.saveMembership")}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className={fieldError}>{message}</span>;
}

const gridStyles: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

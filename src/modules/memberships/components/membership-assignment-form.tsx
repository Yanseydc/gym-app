"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, input } from "@/lib/ui";
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
};

const today = new Date().toISOString().slice(0, 10);

const defaultValues: ClientMembershipFormValues = {
  membershipPlanId: "",
  startDate: today,
  notes: "",
};

export function MembershipAssignmentForm({
  action,
  plans,
}: MembershipAssignmentFormProps) {
  const { t } = useAdminText();
  const { state, formAction, pending } = useClientMembershipForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
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
        disabled={pending || plans.length === 0}
        className={buttonPrimary}
        style={{ width: "fit-content" }}
      >
        {pending ? t("memberships.form.assigning") : t("memberships.form.assign")}
      </button>
    </form>
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

import Link from "next/link";

import { getText } from "@/lib/i18n";
import { infoRow, statusInactive, statusSuccess } from "@/lib/ui";
import type { MembershipPlan } from "@/modules/memberships/types";

type MembershipPlanListProps = {
  plans: MembershipPlan[];
};

export async function MembershipPlanList({ plans }: MembershipPlanListProps) {
  const t = await getText("memberships");
  const common = await getText("common");
  if (plans.length === 0) {
    return (
      <article
        className={infoRow}
        style={{
          padding: 14,
          borderRadius: 12,
          color: "var(--muted)",
        }}
      >
        {t.noPlans}
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {plans.map((plan) => (
        <Link
          key={plan.id}
          href={`/dashboard/memberships/${plan.id}`}
          className={infoRow}
          style={{
            display: "grid",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <strong style={{ fontSize: 18 }}>{plan.name}</strong>
            <span className={plan.isActive ? statusSuccess : statusInactive}>
              {plan.isActive ? common.active : common.inactive}
            </span>
          </div>
          <div style={{ color: "var(--muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>{plan.durationInDays} {t.detail.days}</span>
            <span>${plan.price.toFixed(2)}</span>
          </div>
          {plan.description ? <p style={{ margin: 0, color: "var(--muted)" }}>{plan.description}</p> : null}
        </Link>
      ))}
    </div>
  );
}

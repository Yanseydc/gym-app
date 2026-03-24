import Link from "next/link";

import type { MembershipPlan } from "@/modules/memberships/types";

type MembershipPlanListProps = {
  plans: MembershipPlan[];
};

export function MembershipPlanList({ plans }: MembershipPlanListProps) {
  if (plans.length === 0) {
    return (
      <article
        style={{
          padding: 20,
          borderRadius: "var(--radius)",
          border: "1px dashed var(--border)",
          background: "var(--surface)",
          color: "var(--muted)",
        }}
      >
        No membership plans found.
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {plans.map((plan) => (
        <Link
          key={plan.id}
          href={`/dashboard/memberships/${plan.id}`}
          style={{
            display: "grid",
            gap: 10,
            padding: 18,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
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
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: plan.isActive ? "#dff4e8" : "#efe3d3",
                color: plan.isActive ? "#1f6b42" : "#7a5a2f",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {plan.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div style={{ color: "var(--muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>{plan.durationInDays} days</span>
            <span>${plan.price.toFixed(2)}</span>
          </div>
          {plan.description ? <p style={{ margin: 0, color: "var(--muted)" }}>{plan.description}</p> : null}
        </Link>
      ))}
    </div>
  );
}

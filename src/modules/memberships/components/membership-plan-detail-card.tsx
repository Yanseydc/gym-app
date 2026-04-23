import Link from "next/link";

import { getText } from "@/lib/i18n";
import type { MembershipPlan } from "@/modules/memberships/types";

export async function MembershipPlanDetailCard({ plan }: { plan: MembershipPlan }) {
  const t = await getText("memberships");
  const common = await getText("common");
  return (
    <article
      style={{
        display: "grid",
        gap: 20,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px" }}>{plan.name}</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {plan.durationInDays} {t.detail.days} · ${plan.price.toFixed(2)}
          </p>
        </div>

        <Link
          href={`/dashboard/memberships/${plan.id}/edit`}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--surface-alt)",
            fontWeight: 700,
          }}
        >
          {t.detail.editPlan}
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <DetailItem label={t.detail.status} value={plan.isActive ? common.active : common.inactive} />
        <DetailItem label={t.detail.created} value={new Date(plan.createdAt).toLocaleString()} />
        <DetailItem label={t.detail.updated} value={new Date(plan.updatedAt).toLocaleString()} />
        <DetailItem label={t.detail.description} value={plan.description || t.noDescription} fullWidth />
      </div>
    </article>
  );
}

function DetailItem({
  fullWidth = false,
  label,
  value,
}: {
  fullWidth?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "rgba(239, 229, 212, 0.5)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>{label}</span>
      <strong style={{ whiteSpace: "pre-wrap" }}>{value}</strong>
    </div>
  );
}

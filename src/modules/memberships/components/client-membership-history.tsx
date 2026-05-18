import Link from "next/link";
import { Ban } from "lucide-react";

import { getAdminText } from "@/lib/i18n/admin";
import { buttonDanger, cardSubtle, statusSuccess, statusWarning } from "@/lib/ui";
import { cancelClientMembership } from "@/modules/memberships/services/cancel-client-membership";
import type { ClientMembership } from "@/modules/memberships/types";
import { MembershipStatusBadge } from "@/modules/memberships/components/membership-status-badge";

type ClientMembershipHistoryProps = {
  clientId: string;
  memberships: ClientMembership[];
};

export async function ClientMembershipHistory({
  clientId,
  memberships,
}: ClientMembershipHistoryProps) {
  const { t } = await getAdminText();
  if (memberships.length === 0) {
    return (
      <article
        className={cardSubtle}
        style={{
          padding: 18,
          borderRadius: 16,
          color: "var(--muted)",
        }}
      >
        {t("memberships.empty")}
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {memberships.map((membership) => (
        <article
          key={membership.id}
          className={cardSubtle}
        style={{
          display: "grid",
          gap: 10,
          padding: 16,
          borderRadius: 16,
        }}
        >
          <div className="responsive-inline-header">
            <div>
              <Link
                href={`/dashboard/memberships/${membership.membershipPlanId}`}
                style={{ fontWeight: 700 }}
              >
                {membership.planName}
              </Link>
              <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                {t("common.dateRange", { start: membership.startDate, end: membership.endDate })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <MembershipStatusBadge status={getLifecycleStatus(membership)} />
              <BalanceBadge
                dueLabel={t("memberships.remainingBalance")}
                paidLabel={t("memberships.paidInFull")}
                remainingBalance={membership.remainingBalance}
              />
            </div>
          </div>

          <div className="responsive-meta-grid">
            <DetailItem label={t("memberships.planPrice")} value={`$${membership.planPrice.toFixed(2)}`} />
            <DetailItem label={t("memberships.totalPaid")} value={`$${membership.totalPaid.toFixed(2)}`} />
            <DetailItem
              label={t("memberships.remainingBalance")}
              value={`$${membership.remainingBalance.toFixed(2)}`}
            />
          </div>

          {membership.notes ? (
            <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
              {membership.notes}
            </p>
          ) : null}

          {membership.status === "active" ? (
            <form action={cancelClientMembership.bind(null, clientId, membership.id)}>
              <button
                type="submit"
                className={buttonDanger}
              >
                <Ban size={15} aria-hidden="true" />
                {t("memberships.cancel")}
              </button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function getLifecycleStatus(membership: ClientMembership) {
  if (membership.status === "cancelled") {
    return "cancelled";
  }

  const today = new Date().toISOString().slice(0, 10);
  return membership.endDate < today ? "expired" : "active";
}

function BalanceBadge({
  dueLabel,
  paidLabel,
  remainingBalance,
}: {
  dueLabel: string;
  paidLabel: string;
  remainingBalance: number;
}) {
  const isPending = remainingBalance > 0;

  return (
    <span className={isPending ? statusWarning : statusSuccess}>
      {isPending ? `${dueLabel}: $${remainingBalance.toFixed(2)}` : paidLabel}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={cardSubtle}
      style={{
        padding: 14,
        borderRadius: 14,
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

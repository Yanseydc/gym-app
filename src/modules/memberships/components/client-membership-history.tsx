import Link from "next/link";

import { cancelClientMembership } from "@/modules/memberships/services/cancel-client-membership";
import type { ClientMembership } from "@/modules/memberships/types";
import { MembershipStatusBadge } from "@/modules/memberships/components/membership-status-badge";

type ClientMembershipHistoryProps = {
  clientId: string;
  memberships: ClientMembership[];
};

export function ClientMembershipHistory({
  clientId,
  memberships,
}: ClientMembershipHistoryProps) {
  if (memberships.length === 0) {
    return (
      <article
        style={{
          padding: 18,
          borderRadius: 16,
          border: "1px dashed var(--border)",
          background: "rgba(255, 255, 255, 0.03)",
          color: "var(--muted)",
        }}
      >
        No membership history yet.
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {memberships.map((membership) => (
        <article
          key={membership.id}
        style={{
          display: "grid",
          gap: 10,
          padding: 16,
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.03)",
        }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <Link
                href={`/dashboard/memberships/${membership.membershipPlanId}`}
                style={{ fontWeight: 700 }}
              >
                {membership.planName}
              </Link>
              <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                {membership.startDate} to {membership.endDate}
              </p>
            </div>
            <MembershipStatusBadge status={membership.status} />
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            }}
          >
            <DetailItem label="Plan price" value={`$${membership.planPrice.toFixed(2)}`} />
            <DetailItem label="Total paid" value={`$${membership.totalPaid.toFixed(2)}`} />
            <DetailItem
              label="Remaining balance"
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
                style={{
                  width: "fit-content",
                  border: "1px solid var(--border)",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.02)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel membership
              </button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: "rgba(255, 255, 255, 0.04)",
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

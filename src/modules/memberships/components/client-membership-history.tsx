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
          padding: 20,
          borderRadius: "var(--radius)",
          border: "1px dashed var(--border)",
          background: "var(--surface)",
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
            gap: 12,
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
                  background: "transparent",
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

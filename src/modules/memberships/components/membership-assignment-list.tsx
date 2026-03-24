import Link from "next/link";

import { MembershipStatusBadge } from "@/modules/memberships/components/membership-status-badge";
import type { MembershipStatus } from "@/modules/memberships/types";

type MembershipAssignmentListProps = {
  assignments: Array<{
    id: string;
    clientId: string;
    clientName: string;
    startDate: string;
    endDate: string;
    status: MembershipStatus;
  }>;
};

export function MembershipAssignmentList({
  assignments,
}: MembershipAssignmentListProps) {
  if (assignments.length === 0) {
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
        No client assignments yet.
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {assignments.map((assignment) => (
        <article
          key={assignment.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: 18,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div>
            <Link href={`/dashboard/clients/${assignment.clientId}`} style={{ fontWeight: 700 }}>
              {assignment.clientName}
            </Link>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              {assignment.startDate} to {assignment.endDate}
            </p>
          </div>
          <MembershipStatusBadge status={assignment.status} />
        </article>
      ))}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { MembershipAssignmentList } from "@/modules/memberships/components/membership-assignment-list";
import { MembershipPlanDetailCard } from "@/modules/memberships/components/membership-plan-detail-card";
import {
  getMembershipAssignmentsForPage,
  getMembershipPlanForPage,
} from "@/modules/memberships/services/membership-service";

type MembershipDetailPageProps = {
  params: Promise<{
    membershipId: string;
  }>;
};

export default async function MembershipDetailPage({
  params,
}: MembershipDetailPageProps) {
  const { membershipId } = await params;
  const [{ data: plan, error }, { data: assignments, error: assignmentsError }] =
    await Promise.all([
      getMembershipPlanForPage(membershipId),
      getMembershipAssignmentsForPage(membershipId),
    ]);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link
          href="/dashboard/memberships"
          style={{ color: "var(--muted)", fontWeight: 600 }}
        >
          Back to memberships
        </Link>
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!plan) {
    notFound();
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link href="/dashboard/memberships" style={{ color: "var(--muted)", fontWeight: 600 }}>
        Back to memberships
      </Link>

      <MembershipPlanDetailCard plan={plan} />

      <section style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Assignment history</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Clients who have used this membership plan.
          </p>
        </div>

        {assignmentsError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fff2f2",
              color: "#8a1c1c",
            }}
          >
            {assignmentsError}
          </p>
        ) : (
          <MembershipAssignmentList assignments={assignments} />
        )}
      </section>
    </div>
  );
}

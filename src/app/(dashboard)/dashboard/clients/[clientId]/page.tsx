import Link from "next/link";
import { notFound } from "next/navigation";

import { hasModuleAccess } from "@/lib/auth/permissions";
import { ClientDetailCard } from "@/modules/clients/components/client-detail-card";
import { getClientForPage } from "@/modules/clients/services/client-service";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { ClientMembershipHistory } from "@/modules/memberships/components/client-membership-history";
import { MembershipAssignmentForm } from "@/modules/memberships/components/membership-assignment-form";
import { assignMembershipToClient } from "@/modules/memberships/services/assign-membership";
import {
  getActiveMembershipPlansForPage,
  getClientMembershipHistoryForPage,
} from "@/modules/memberships/services/membership-service";

type ClientDetailPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  const [
    { data: client, error },
    { data: membershipHistory, error: membershipHistoryError },
    { data: activePlans, error: activePlansError },
  ] = await Promise.all([
    getClientForPage(clientId),
    getClientMembershipHistoryForPage(clientId),
    getActiveMembershipPlansForPage(),
  ]);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back to clients
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

  if (!client) {
    notFound();
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
        Back to clients
      </Link>

      <ClientDetailCard client={client} />

      <section style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Membership history</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Current and past memberships assigned to this client.
          </p>
        </div>

        {membershipHistoryError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fff2f2",
              color: "#8a1c1c",
            }}
          >
            {membershipHistoryError}
          </p>
        ) : (
          <ClientMembershipHistory clientId={client.id} memberships={membershipHistory} />
        )}
      </section>

      {user && hasModuleAccess(user.role, "memberships") ? (
        <section
          style={{
            display: "grid",
            gap: 16,
            padding: 24,
            borderRadius: 24,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Assign membership</h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Choose an active plan and assign it to this client.
            </p>
          </div>

          {activePlansError ? (
            <p
              style={{
                margin: 0,
                padding: "12px 14px",
                borderRadius: 12,
                background: "#fff2f2",
                color: "#8a1c1c",
              }}
            >
              {activePlansError}
            </p>
          ) : (
            <MembershipAssignmentForm
              action={assignMembershipToClient.bind(null, client.id)}
              plans={activePlans}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}

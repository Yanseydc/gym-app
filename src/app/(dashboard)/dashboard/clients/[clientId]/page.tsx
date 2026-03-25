import Link from "next/link";
import { notFound } from "next/navigation";

import { hasModuleAccess } from "@/lib/auth/permissions";
import { ClientDetailCard } from "@/modules/clients/components/client-detail-card";
import { getClientForPage } from "@/modules/clients/services/client-service";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { CheckInForm } from "@/modules/checkins/components/checkin-form";
import { CheckInHistoryList } from "@/modules/checkins/components/checkin-history-list";
import { CheckInStatusBadge } from "@/modules/checkins/components/checkin-status-badge";
import { createCheckIn } from "@/modules/checkins/services/create-checkin";
import { getClientCheckInsForPage } from "@/modules/checkins/services/checkin-service";
import { ClientMembershipHistory } from "@/modules/memberships/components/client-membership-history";
import { MembershipAssignmentForm } from "@/modules/memberships/components/membership-assignment-form";
import { assignMembershipToClient } from "@/modules/memberships/services/assign-membership";
import {
  getActiveMembershipPlansForPage,
  getClientMembershipHistoryForPage,
} from "@/modules/memberships/services/membership-service";
import { PaymentForm } from "@/modules/payments/components/payment-form";
import { PaymentList } from "@/modules/payments/components/payment-list";
import { createPayment } from "@/modules/payments/services/create-payment";
import { getClientPaymentsForPage } from "@/modules/payments/services/payment-service";

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
    { data: payments, error: paymentsError },
    { data: checkIns, error: checkInsError },
  ] = await Promise.all([
    getClientForPage(clientId),
    getClientMembershipHistoryForPage(clientId),
    getActiveMembershipPlansForPage(),
    getClientPaymentsForPage(clientId),
    getClientCheckInsForPage(clientId),
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

      {user && hasModuleAccess(user.role, "payments") ? (
        <>
          <section style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 8px" }}>Payment history</h2>
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  Manual payments registered for this client.
                </p>
              </div>

              <Link
                href={`/dashboard/payments/new?clientId=${client.id}`}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: "var(--surface-alt)",
                  fontWeight: 700,
                }}
              >
                Open payment page
              </Link>
            </div>

            {paymentsError ? (
              <p
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#fff2f2",
                  color: "#8a1c1c",
                }}
              >
                {paymentsError}
              </p>
            ) : (
              <PaymentList payments={payments} showClient={false} />
            )}
          </section>

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
              <h2 style={{ margin: "0 0 8px" }}>Register payment</h2>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Record a manual payment and optionally link it to a client membership.
              </p>
            </div>

            <PaymentForm
              action={createPayment.bind(null, client.id)}
              clients={[
                {
                  id: client.id,
                  label: `${client.firstName} ${client.lastName}`,
                },
              ]}
              memberships={membershipHistory.map((membership) => ({
                id: membership.id,
                clientId: membership.clientId,
                label: `${membership.planName} · ${membership.startDate} to ${membership.endDate} · $${membership.remainingBalance.toFixed(2)} remaining`,
              }))}
              submitLabel="Register payment"
              defaultValues={{
                clientId: client.id,
                paymentMethod: "cash",
              }}
              lockClient
            />
          </section>
        </>
      ) : null}

      {user && hasModuleAccess(user.role, "checkins") ? (
        <>
          <section style={{ display: "grid", gap: 16 }}>
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
                <h2 style={{ margin: "0 0 8px" }}>Check-in history</h2>
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  Reception log for this client.
                </p>
              </div>
              {membershipHistory[0] ? (
                <CheckInStatusBadge status={membershipHistory[0].status} />
              ) : null}
            </div>

            {checkInsError ? (
              <p
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#fff2f2",
                  color: "#8a1c1c",
                }}
              >
                {checkInsError}
              </p>
            ) : (
              <CheckInHistoryList checkIns={checkIns} showClient={false} />
            )}
          </section>

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
              <h2 style={{ margin: "0 0 8px" }}>Manual check-in</h2>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                A client can only enter if they currently have an active membership.
              </p>
            </div>

            {membershipHistory.some((membership) => membership.status === "active") ? (
              <CheckInForm action={createCheckIn.bind(null, client.id)} />
            ) : (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "#fff2f2",
                  color: "#8a1c1c",
                }}
              >
                This client does not currently have an active membership, so check-in is blocked.
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

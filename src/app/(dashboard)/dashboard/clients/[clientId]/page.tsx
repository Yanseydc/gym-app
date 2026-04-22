import Link from "next/link";
import { notFound } from "next/navigation";

import { hasModuleAccess } from "@/lib/auth/permissions";
import { ClientDetailCard } from "@/modules/clients/components/client-detail-card";
import { getClientForPage } from "@/modules/clients/services/client-service";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { ClientOnboardingCard } from "@/modules/coaching/components/onboarding-card";
import { ProgressCheckInSection } from "@/modules/coaching/components/progress-checkin-card";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";
import { getPortalAccessForPage } from "@/modules/coaching/services/portal-access-service";
import { getProgressCheckInsForPage } from "@/modules/coaching/services/progress-checkin-service";
import { RoutineSummaryList } from "@/modules/coaching/components/routine-detail-card";
import { getClientRoutineSummariesForPage } from "@/modules/coaching/services/routine-service";
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
    { data: routines, error: routinesError },
    { data: onboarding, error: onboardingError },
    { data: progressCheckIns, error: progressCheckInsError },
    { data: portalAccess, error: portalAccessError },
  ] = await Promise.all([
    getClientForPage(clientId),
    getClientMembershipHistoryForPage(clientId),
    getActiveMembershipPlansForPage(),
    getClientPaymentsForPage(clientId),
    getClientCheckInsForPage(clientId),
    getClientRoutineSummariesForPage(clientId),
    getOnboardingForPage(clientId),
    getProgressCheckInsForPage(clientId),
    getPortalAccessForPage(clientId),
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

  const activeRoutine = routines.find((routine) => routine.status === "active") ?? null;
  const latestProgressCheckIn = progressCheckIns[0] ?? null;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
        Back to clients
      </Link>

      <ClientDetailCard client={client} />

      {user && hasModuleAccess(user.role, "coaching") ? (
        <section style={{ display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Coaching summary</h2>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Key signals and quick actions for this client.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            <SummaryCard
              eyebrow="Portal access"
              title={
                portalAccess
                  ? [portalAccess.profile.firstName, portalAccess.profile.lastName].filter(Boolean).join(" ") ||
                    portalAccess.profile.email
                  : portalAccessError
                    ? "Access unavailable"
                    : "Not linked yet"
              }
              description={
                portalAccess
                  ? portalAccess.profile.email
                  : portalAccessError ?? "Link a member profile to unlock the client portal."
              }
              meta={portalAccess ? `Linked ${new Date(portalAccess.linkedAt).toLocaleDateString()}` : "Manual setup"}
              actionHref={
                portalAccess
                  ? undefined
                  : `/dashboard/clients/${client.id}/portal-access/new`
              }
              actionLabel={portalAccess ? undefined : "Link portal user"}
            />

            <SummaryCard
              eyebrow="Onboarding snapshot"
              title={onboarding ? onboarding.goal : onboardingError ? "Onboarding unavailable" : "No onboarding yet"}
              description={
                onboarding
                  ? `${onboarding.availableDays} days/week · ${onboarding.experienceLevel}`
                  : onboardingError ?? "Capture the baseline details used for planning."
              }
              meta={onboarding ? `${onboarding.weightKg} kg · ${onboarding.heightCm} cm` : "Planning setup"}
              actionHref={`/dashboard/clients/${client.id}/onboarding/${onboarding ? "edit" : "new"}`}
              actionLabel={onboarding ? "Edit onboarding" : "Create onboarding"}
            />

            <SummaryCard
              eyebrow="Active routine"
              title={activeRoutine ? activeRoutine.title : routinesError ? "Routines unavailable" : "No active routine"}
              description={
                activeRoutine
                  ? `${activeRoutine.dayCount} day blocks`
                  : routinesError ?? "Create or apply a routine to keep coaching moving."
              }
              meta={activeRoutine ? `Updated ${new Date(activeRoutine.updatedAt).toLocaleDateString()}` : "Training plan"}
              actionHref={
                activeRoutine
                  ? `/dashboard/coaching/routines/${activeRoutine.id}`
                  : `/dashboard/coaching/routines/new?clientId=${client.id}`
              }
              actionLabel={activeRoutine ? "View routine" : "Create routine"}
              status={activeRoutine ? <StatusChip label="Active" tone="success" /> : undefined}
            />

            <SummaryCard
              eyebrow="Latest progress"
              title={
                latestProgressCheckIn
                  ? latestProgressCheckIn.checkinDate
                  : progressCheckInsError
                    ? "Check-ins unavailable"
                    : "No check-ins yet"
              }
              description={
                latestProgressCheckIn
                  ? latestProgressCheckIn.photoTypes.length > 0
                    ? `${latestProgressCheckIn.photoTypes.length} photos attached`
                    : "No photos attached"
                  : progressCheckInsError ?? "Capture quick progress snapshots over time."
              }
              meta={
                latestProgressCheckIn
                  ? latestProgressCheckIn.weightKg
                    ? `${latestProgressCheckIn.weightKg} kg`
                    : "Weight not recorded"
                  : "Progress tracking"
              }
              actionHref={
                latestProgressCheckIn
                  ? `/dashboard/clients/${client.id}/progress-checkins/${latestProgressCheckIn.id}/edit`
                  : `/dashboard/clients/${client.id}/progress-checkins/new`
              }
              actionLabel={latestProgressCheckIn ? "Open latest check-in" : "Create first check-in"}
            />
          </div>
        </section>
      ) : null}

      {user && hasModuleAccess(user.role, "coaching") ? (
        <section style={{ display: "grid", gap: 18 }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Coaching workspace</h2>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Detailed planning and routine management for this client.
            </p>
          </div>

          <section
            style={{
              display: "grid",
              gap: 18,
              padding: 24,
              borderRadius: 24,
              border: "1px solid rgba(0, 0, 0, 0.08)",
              background:
                "linear-gradient(180deg, rgba(255, 248, 240, 0.98), rgba(255, 255, 255, 0.96))",
              boxShadow: "0 18px 40px rgba(0, 0, 0, 0.08)",
            }}
          >
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
                <span
                  style={{
                    display: "inline-block",
                    marginBottom: 10,
                    color: "var(--accent-strong)",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Training plans
                </span>
                <h3 style={{ margin: "0 0 6px", fontSize: 26, lineHeight: 1.1 }}>Routines</h3>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                  Create, reuse, and adjust training plans without leaving the client view.
                </p>
              </div>

              <Link
                href={`/dashboard/coaching/routines/new?clientId=${client.id}`}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: "var(--accent)",
                  color: "#fff",
                  fontWeight: 700,
                  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.12)",
                }}
              >
                Create routine
              </Link>
            </div>

            {routinesError ? (
              <p
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#fff2f2",
                  color: "#8a1c1c",
                }}
              >
                {routinesError}
              </p>
            ) : (
              <RoutineSummaryList clientId={client.id} routines={routines} />
            )}
          </section>

          {progressCheckInsError ? (
            <p
              style={{
                margin: 0,
                padding: "12px 14px",
                borderRadius: 12,
                background: "#fff2f2",
                color: "#8a1c1c",
              }}
            >
              {progressCheckInsError}
            </p>
          ) : (
            <ProgressCheckInSection clientId={client.id} checkIns={progressCheckIns} />
          )}
        </section>
      ) : null}

      <section style={{ display: "grid", gap: 18 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Operations</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Memberships, payments, and check-in activity for this client.
          </p>
        </div>

        <section style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 style={{ margin: "0 0 8px" }}>Membership history</h3>
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
                planPrice: membership.planPrice,
                totalPaid: membership.totalPaid,
                remainingBalance: membership.remainingBalance,
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

function SummaryCard({
  actionHref,
  actionLabel,
  description,
  eyebrow,
  meta,
  status,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  eyebrow: string;
  meta: string;
  status?: React.ReactNode;
  title: string;
}) {
  return (
    <article
      style={{
        display: "grid",
        gap: 14,
        padding: 20,
        borderRadius: 20,
        border: "1px solid rgba(0, 0, 0, 0.06)",
        background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.78))",
        boxShadow: "var(--shadow)",
        minHeight: 184,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <span
          style={{
            color: "var(--muted)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </span>
        {status}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <strong style={{ fontSize: 20, lineHeight: 1.25 }}>{title}</strong>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.55 }}>{description}</p>
      </div>

      <div
        style={{
          padding: "10px 12px",
          borderRadius: 14,
          background: "rgba(239, 229, 212, 0.42)",
          color: "var(--muted)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {meta}
      </div>

      {actionHref && actionLabel ? (
        <div>
          <Link
            href={actionHref}
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 12,
              background: "var(--surface-alt)",
              fontWeight: 700,
            }}
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "success";
}) {
  const palette =
    tone === "success"
      ? { background: "#dff4e8", color: "#1f6b42" }
      : { background: "#ece8e1", color: "#6b6258" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        ...palette,
      }}
    >
      {label}
    </span>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { hasModuleAccess } from "@/lib/auth/permissions";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { ClientDetailCard } from "@/modules/clients/components/client-detail-card";
import { getClientForPage } from "@/modules/clients/services/client-service";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
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
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export default async function ClientDetailPage({ params, searchParams }: ClientDetailPageProps) {
  const { clientId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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
            background: "var(--danger-bg)",
            color: "var(--danger-fg)",
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
  const canAccessCoaching = Boolean(user && hasModuleAccess(user.role, "coaching"));
  const canAccessMemberships = Boolean(user && hasModuleAccess(user.role, "memberships"));
  const canAccessPayments = Boolean(user && hasModuleAccess(user.role, "payments"));
  const canAccessCheckIns = Boolean(user && hasModuleAccess(user.role, "checkins"));
  const canAccessOperations = canAccessMemberships || canAccessPayments || canAccessCheckIns;
  const canAccessHistory = canAccessMemberships || canAccessPayments || canAccessCheckIns;
  const requestedTab = resolvedSearchParams?.tab;
  const activeTab =
    requestedTab === "coaching" && canAccessCoaching
      ? "coaching"
      : requestedTab === "history" && canAccessHistory
        ? "history"
      : requestedTab === "operations" && canAccessOperations
        ? "operations"
        : "overview";
  const baseClientPath = `/dashboard/clients/${client.id}`;
  const tabs = [
    { id: "overview", label: "Overview", href: baseClientPath, visible: true },
    {
      id: "coaching",
      label: "Coaching",
      href: `${baseClientPath}?tab=coaching`,
      visible: canAccessCoaching,
    },
    {
      id: "history",
      label: "History",
      href: `${baseClientPath}?tab=history`,
      visible: canAccessHistory,
    },
    {
      id: "operations",
      label: "Operations",
      href: `${baseClientPath}?tab=operations`,
      visible: canAccessOperations,
    },
  ].filter((tab) => tab.visible);

  return (
    <div className="client-detail-page">
      <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
        Back to clients
      </Link>

      <nav aria-label="Client detail sections" className="client-tabs-nav">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`client-tab-link${isActive ? " is-active" : ""}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "overview" ? <ClientDetailCard client={client} /> : null}

      {activeTab === "overview" && canAccessCoaching ? (
        <section style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={{ margin: "0 0 8px" }}>Coaching summary</h2>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Key signals and quick actions for this client.
            </p>
          </div>

          <div className="client-summary-grid">
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

      {activeTab === "coaching" && canAccessCoaching ? (
        <section style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={{ margin: "0 0 8px" }}>Coaching workspace</h2>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Current coaching work, routine planning, and progress tracking for this client.
            </p>
          </div>

          <section style={workspacePanelStyles}>
            <div style={workspaceHeaderStyles}>
              <div style={{ display: "grid", gap: 8 }}>
                <span style={workspaceEyebrowStyles}>Coaching workspace</span>
                <div style={{ display: "grid", gap: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>Training and progress</h3>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    Stay inside one work zone to manage routines, review progress, and move the client forward.
                  </p>
                </div>
              </div>
            </div>

            <section style={{ display: "grid", gap: 14 }}>
              <div className="responsive-inline-header">
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 18 }}>Routines</h4>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.55 }}>
                    Create, reuse, and adjust training plans without leaving the client view.
                  </p>
                </div>

                <Link href={`/dashboard/coaching/routines/new?clientId=${client.id}`} className={buttonPrimary}>
                  Create routine
                </Link>
              </div>

              {routinesError ? (
                <p style={errorBoxStyles}>{routinesError}</p>
              ) : (
                <RoutineSummaryList clientId={client.id} routines={routines} />
              )}
            </section>

            <div style={workspaceDividerStyles} />

            <section style={{ display: "grid", gap: 14 }}>
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 18 }}>Progress check-ins</h4>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.55 }}>
                  Review the latest coaching notes and body progress in the same workspace.
                </p>
              </div>

              {progressCheckInsError ? (
                <p style={errorBoxStyles}>{progressCheckInsError}</p>
              ) : (
                <ProgressCheckInSection clientId={client.id} checkIns={progressCheckIns} />
              )}
            </section>
          </section>
        </section>
      ) : null}

      {activeTab === "history" && canAccessHistory ? (
      <section style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <h2 style={{ margin: "0 0 8px" }}>History</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Review the client timeline without mixing it with day-to-day operational actions.
          </p>
        </div>

        <section style={contentPanelStyles}>
          <div
            style={{
              display: "grid",
              gap: 6,
            }}
          >
            <span style={sectionEyebrowStyles}>Timeline</span>
            <h3 style={{ margin: 0, fontSize: 22 }}>Client activity history</h3>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Membership lifecycle, payments, and front-desk check-ins in one reading flow.
            </p>
          </div>

          {canAccessMemberships ? (
            <section style={{ display: "grid", gap: 14 }}>
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 18 }}>Membership history</h4>
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  Current and past memberships assigned to this client.
                </p>
              </div>

              {membershipHistoryError ? (
                <p style={errorBoxStyles}>{membershipHistoryError}</p>
              ) : (
                <ClientMembershipHistory clientId={client.id} memberships={membershipHistory} />
              )}
            </section>
          ) : null}

          {canAccessPayments ? (
            <section style={{ display: "grid", gap: 14 }}>
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 18 }}>Payment history</h4>
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  Manual payments registered for this client.
                </p>
              </div>

              {paymentsError ? (
                <p style={errorBoxStyles}>{paymentsError}</p>
              ) : (
                <PaymentList payments={payments} showClient={false} />
              )}
            </section>
          ) : null}

          {canAccessCheckIns ? (
            <section style={{ display: "grid", gap: 14 }}>
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
                  <h4 style={{ margin: "0 0 6px", fontSize: 18 }}>Check-in history</h4>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    Reception log for this client.
                  </p>
                </div>
                {membershipHistory[0] ? (
                  <CheckInStatusBadge status={membershipHistory[0].status} />
                ) : null}
              </div>

              {checkInsError ? (
                <p style={errorBoxStyles}>{checkInsError}</p>
              ) : (
                <CheckInHistoryList checkIns={checkIns} showClient={false} />
              )}
            </section>
          ) : null}
        </section>
      </section>
      ) : null}

      {activeTab === "operations" && canAccessOperations ? (
      <section style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <h2 style={{ margin: "0 0 8px" }}>Operations</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Quick front-desk actions only. Keep forms lightweight and separate from longer reading contexts.
          </p>
        </div>

          <section style={{ ...contentPanelStyles, gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={sectionEyebrowStyles}>Actions</span>
              <h3 style={{ margin: 0, fontSize: 22 }}>Quick operations</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                Lightweight forms for front-desk tasks and client account updates.
              </p>
            </div>

            {canAccessMemberships ? (
              <UtilityFormPanel
                title="Assign membership"
                description="Choose an active plan and assign it to this client."
              >
                {activePlansError ? (
                  <p style={errorBoxStyles}>{activePlansError}</p>
                ) : (
                  <MembershipAssignmentForm
                    action={assignMembershipToClient.bind(null, client.id)}
                    plans={activePlans}
                  />
                )}
              </UtilityFormPanel>
            ) : null}

            {canAccessPayments ? (
              <UtilityFormPanel
                title="Register payment"
                description="Record a manual payment and optionally link it to a client membership."
              >
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
              </UtilityFormPanel>
            ) : null}

            {canAccessCheckIns ? (
              <UtilityFormPanel
                title="Manual check-in"
                description="A client can only enter if they currently have an active membership."
              >
                {membershipHistory.some((membership) => membership.status === "active") ? (
                  <CheckInForm action={createCheckIn.bind(null, client.id)} />
                ) : (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: "var(--danger-bg)",
                      color: "var(--danger-fg)",
                    }}
                  >
                    This client does not currently have an active membership, so check-in is blocked.
                  </div>
                )}
              </UtilityFormPanel>
            ) : null}
          </section>
      </section>
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
  status?: ReactNode;
  title: string;
}) {
  return (
    <article
      style={{
        display: "grid",
        gap: 12,
        padding: 18,
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.03)",
        minHeight: 168,
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
          padding: "9px 11px",
          borderRadius: 12,
          background: "rgba(255, 255, 255, 0.04)",
          color: "var(--muted)",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {meta}
      </div>

      {actionHref && actionLabel ? (
        <div>
          <Link
            href={actionHref}
            className={buttonSecondary}
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function UtilityFormPanel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.02)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <h4 style={{ margin: 0, fontSize: 17 }}>{title}</h4>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.55 }}>{description}</p>
      </div>
      {children}
    </section>
  );
}

const sectionEyebrowStyles: CSSProperties = {
  color: "var(--accent-strong)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};

const contentPanelStyles: CSSProperties = {
  display: "grid",
  gap: 18,
  padding: 20,
  borderRadius: 22,
  border: "1px solid var(--border)",
  background: "rgba(255, 255, 255, 0.02)",
};

const workspacePanelStyles: CSSProperties = {
  display: "grid",
  gap: 20,
  padding: 22,
  borderRadius: 24,
  border: "1px solid var(--border)",
  background: "rgba(255, 255, 255, 0.025)",
};

const workspaceHeaderStyles: CSSProperties = {
  display: "grid",
  gap: 8,
};

const workspaceEyebrowStyles: CSSProperties = {
  color: "var(--accent-strong)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const workspaceDividerStyles: CSSProperties = {
  height: 1,
  background: "var(--border)",
};

const errorBoxStyles: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  borderRadius: 12,
  background: "var(--danger-bg)",
  color: "var(--danger-fg)",
};


function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "success";
}) {
  const palette =
    tone === "success"
      ? { background: "var(--success-bg)", color: "var(--success)" }
      : { background: "var(--neutral-badge-bg)", color: "var(--neutral-badge-fg)" };

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

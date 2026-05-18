import Link from "next/link";
import { Activity, ClipboardList, Dumbbell, Mail, UserRound, type LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { BackNavigation } from "@/components/navigation/back-navigation";
import { hasModuleAccess } from "@/lib/auth/permissions";
import { getAdminText } from "@/lib/i18n/admin";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { ClientDetailCard } from "@/modules/clients/components/client-detail-card";
import { ClientMergePanel } from "@/modules/clients/components/client-merge-panel";
import { getClientForPage, getClientMergeCandidatesForPage } from "@/modules/clients/services/client-service";
import { mergeClient } from "@/modules/clients/services/merge-client";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { ProgressCheckInSection } from "@/modules/coaching/components/progress-checkin-card";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";
import { getPortalAccessForPage } from "@/modules/coaching/services/portal-access-service";
import { getProgressCheckInsForPage } from "@/modules/coaching/services/progress-checkin-service";
import { ResendPortalAccessButton } from "@/modules/coaching/components/resend-portal-access-button";
import { RoutineSummaryList } from "@/modules/coaching/components/routine-detail-card";
import { getClientRoutineSummariesForPage } from "@/modules/coaching/services/routine-service";
import { UpdatePortalAccessEmailButton } from "@/modules/coaching/components/update-portal-access-email-button";
import { updateClientPortalAccessEmail } from "@/modules/coaching/services/update-portal-access-email";
import { resendClientPortalAccess } from "@/modules/coaching/services/resend-portal-access";
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
  const { t, locale } = await getAdminText();
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
    { data: mergeCandidates, error: mergeCandidatesError },
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
    getClientMergeCandidatesForPage(clientId),
  ]);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackNavigation href="/dashboard/clients" label={t("common.backToClients")} />
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

  const formatDayCount = (count: number) =>
    t(count === 1 ? "common.dayCountOne" : "common.dayCountOther", { count });

  const activeRoutine = routines.find((routine) => routine.status === "active") ?? null;
  const draftRoutineCount = routines.filter((routine) => routine.status === "draft").length;
  const archivedRoutineCount = routines.filter((routine) => routine.status === "archived").length;
  const latestProgressCheckIn = progressCheckIns[0] ?? null;
  const canAccessCoaching = Boolean(user && hasModuleAccess(user.role, "coaching"));
  const canAccessMemberships = Boolean(user && hasModuleAccess(user.role, "memberships"));
  const canAccessPayments = Boolean(user && hasModuleAccess(user.role, "payments"));
  const canAccessCheckIns = Boolean(user && hasModuleAccess(user.role, "checkins"));
  const canAccessOperations = canAccessMemberships || canAccessPayments || canAccessCheckIns;
  const canAccessHistory = canAccessMemberships || canAccessPayments || canAccessCheckIns;
  const canMergeClients = Boolean(user && (user.role === "admin" || user.role === "staff"));
  const canResendPortalAccess = Boolean(user && (user.role === "admin" || user.role === "staff"));
  const clientEmail = client.email?.trim() || null;
  const portalEmail = portalAccess?.profile.email.trim() || null;
  const hasPortalEmailMismatch = Boolean(
    clientEmail &&
    portalEmail &&
    clientEmail.toLowerCase() !== portalEmail.toLowerCase(),
  );
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
    { id: "overview", label: t("clients.detail.tabs.overview"), href: baseClientPath, visible: true },
    {
      id: "coaching",
      label: t("clients.detail.tabs.coaching"),
      href: `${baseClientPath}?tab=coaching`,
      visible: canAccessCoaching,
    },
    {
      id: "history",
      label: t("clients.detail.tabs.history"),
      href: `${baseClientPath}?tab=history`,
      visible: canAccessHistory,
    },
    {
      id: "operations",
      label: t("clients.detail.tabs.operations"),
      href: `${baseClientPath}?tab=operations`,
      visible: canAccessOperations,
    },
  ].filter((tab) => tab.visible);
  const getMembershipLifecycleStatus = (membership: (typeof membershipHistory)[number]) => {
    if (membership.status === "cancelled") {
      return "cancelled";
    }

    const today = new Date().toISOString().slice(0, 10);
    return membership.endDate < today ? "expired" : "active";
  };

  return (
    <div className="client-detail-page">
      <BackNavigation
        href="/dashboard/clients"
        label={t("common.backToClients")}
        breadcrumbs={[
          { href: "/dashboard/clients", label: t("nav.clients") },
          { label: `${client.firstName} ${client.lastName}` },
        ]}
      />

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

      {activeTab === "overview" && canMergeClients && !mergeCandidatesError ? (
        <ClientMergePanel
          candidates={mergeCandidates}
          action={mergeClient.bind(null, client.id)}
        />
      ) : null}

      {activeTab === "overview" && (canAccessCoaching || canResendPortalAccess) ? (
        <section style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={{ margin: "0 0 8px" }}>
              {canAccessCoaching ? t("clients.detail.summaryTitle") : t("clients.detail.portalAccess")}
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              {canAccessCoaching
                ? t("clients.detail.summaryDescription")
                : t("clients.detail.portalAccessDescription")}
            </p>
          </div>

          <div className="client-summary-grid">
            <SummaryCard
              icon={portalAccess ? UserRound : Mail}
              eyebrow={t("clients.detail.portalAccess")}
              title={
                portalAccess
                  ? t("clients.detail.portalLinked")
                  : portalAccessError
                    ? t("clients.detail.accessUnavailable")
                    : t("clients.detail.notLinkedYet")
              }
              description={portalAccessError ?? t("clients.detail.portalAccessDescription")}
              descriptionNode={
                portalAccess ? (
                  <PortalAccessEmailSummary
                    clientEmail={clientEmail}
                    hasMismatch={hasPortalEmailMismatch}
                    portalEmail={portalEmail}
                  />
                ) : undefined
              }
              metadata={[
                portalAccess ? t("common.linked", { date: new Date(portalAccess.linkedAt).toLocaleDateString(locale) }) : t("common.manualSetup"),
              ]}
              actions={
                portalAccess
                  ? []
                  : [
                      {
                        href: `/dashboard/clients/${client.id}/portal-access/new`,
                        label: t("clients.detail.linkPortalUser"),
                      },
                    ]
              }
              action={
                portalAccess && canResendPortalAccess ? (
                  <div className="client-summary-card-actions client-summary-card-text" style={{ display: "grid", gap: 8, justifyItems: "start" }}>
                    <ResendPortalAccessButton
                      action={resendClientPortalAccess.bind(null, client.id)}
                      initialCooldownRemainingSeconds={portalAccess.resend.cooldownRemainingSeconds}
                    />
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                      Se reenviará al correo de acceso al portal: <strong>{portalEmail}</strong>.
                    </p>
                    {hasPortalEmailMismatch ? (
                      <UpdatePortalAccessEmailButton
                        action={updateClientPortalAccessEmail.bind(null, client.id)}
                        clientEmail={clientEmail ?? ""}
                        portalEmail={portalEmail ?? ""}
                      />
                    ) : null}
                  </div>
                ) : undefined
              }
            />

            {canAccessCoaching ? (
              <SummaryCard
                icon={ClipboardList}
                eyebrow={t("clients.detail.onboardingSnapshot")}
                title={onboarding ? onboarding.goal : onboardingError ? t("clients.detail.onboardingUnavailable") : t("clients.detail.noOnboardingYet")}
                description={
                  onboarding
                    ? `${t("common.daysPerWeek", { count: onboarding.availableDays })} · ${onboarding.experienceLevel}`
                    : onboardingError ?? t("clients.detail.onboardingDescription")
                }
                metadata={
                  onboarding
                    ? [
                        t("common.daysPerWeek", { count: onboarding.availableDays }),
                        `${onboarding.weightKg} kg`,
                        `${onboarding.heightCm} cm`,
                      ]
                    : [t("common.planningSetup")]
                }
                actions={[
                  {
                    href: `/dashboard/clients/${client.id}/onboarding/${onboarding ? "edit" : "new"}`,
                    label: onboarding ? t("clients.detail.editOnboarding") : t("clients.detail.createOnboarding"),
                  },
                ]}
              />
            ) : null}

            {canAccessCoaching ? (
              <SummaryCard
                icon={Dumbbell}
                eyebrow={t("clients.detail.activeRoutine")}
                title={activeRoutine ? activeRoutine.title : routinesError ? t("clients.detail.routinesUnavailable") : t("clients.detail.noActiveRoutineAssigned")}
                description={
                  activeRoutine
                    ? t("clients.detail.activeRoutineAssigned")
                    : routinesError ?? t("clients.detail.routinesWithoutActiveDescription")
                }
                metadata={
                  activeRoutine
                    ? [
                        formatDayCount(activeRoutine.dayCount),
                        t("common.updatedOn", { date: new Date(activeRoutine.updatedAt).toLocaleDateString(locale) }),
                        draftRoutineCount > 0 ? t("clients.detail.draftRoutinesAvailable", { count: draftRoutineCount }) : "",
                      ].filter(Boolean)
                    : [
                        draftRoutineCount > 0 ? t("clients.detail.draftRoutinesAvailable", { count: draftRoutineCount }) : t("clients.detail.noDraftRoutines"),
                        archivedRoutineCount > 0 ? t("clients.detail.archivedRoutinesAvailable", { count: archivedRoutineCount }) : "",
                      ].filter(Boolean)
                }
                actions={[
                  {
                    href: `${baseClientPath}?tab=coaching`,
                    label: t("clients.detail.viewRoutines"),
                  },
                  {
                    href: `/dashboard/coaching/routines/new?clientId=${client.id}`,
                    label: t("clients.detail.createRoutine"),
                    variant: activeRoutine ? "secondary" : "primary",
                  },
                ]}
                status={activeRoutine ? <StatusChip label={t("common.status.active")} tone="success" /> : undefined}
              />
            ) : null}

            {canAccessCoaching ? (
              <SummaryCard
                icon={Activity}
                eyebrow={t("clients.detail.latestProgress")}
                title={
                  latestProgressCheckIn
                    ? latestProgressCheckIn.checkinDate
                    : progressCheckInsError
                      ? t("clients.detail.checkinsUnavailable")
                      : t("clients.detail.noCheckinsYet")
                }
                description={
                  latestProgressCheckIn
                    ? latestProgressCheckIn.photoTypes.length > 0
                      ? t("clients.detail.photosAttached", { count: latestProgressCheckIn.photoTypes.length })
                      : t("clients.detail.noPhotosAttached")
                    : progressCheckInsError ?? t("clients.detail.progressCheckinsHelper")
                }
                metadata={[
                  latestProgressCheckIn
                    ? latestProgressCheckIn.weightKg
                      ? `${latestProgressCheckIn.weightKg} kg`
                      : t("clients.detail.weightNotRecorded")
                    : t("common.progressTracking"),
                  latestProgressCheckIn
                    ? latestProgressCheckIn.photoTypes.length > 0
                      ? t("clients.detail.photosAttached", { count: latestProgressCheckIn.photoTypes.length })
                      : t("clients.detail.noPhotosAttached")
                    : "",
                ].filter(Boolean)}
                actions={[
                  {
                    href: latestProgressCheckIn
                      ? `/dashboard/clients/${client.id}/progress-checkins/${latestProgressCheckIn.id}/edit`
                      : `/dashboard/clients/${client.id}/progress-checkins/new`,
                    label: latestProgressCheckIn ? t("clients.detail.openLatestCheckin") : t("clients.detail.createFirstCheckin"),
                  },
                  {
                    href: `/dashboard/clients/${client.id}/progress-checkins/new`,
                    label: t("coaching.progress.newCheckin"),
                    variant: "secondary",
                  },
                ]}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "coaching" && canAccessCoaching ? (
        <section style={{ display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0 }}>{t("clients.detail.trainingTitle")}</h2>

          <section style={workspacePanelStyles}>
            <section style={{ display: "grid", gap: 14 }}>
              <div className="responsive-inline-header">
                <h3 style={{ margin: 0, fontSize: 18 }}>{t("clients.detail.routinesTitle")}</h3>

                <Link href={`/dashboard/coaching/routines/new?clientId=${client.id}`} className={buttonPrimary}>
                  {t("clients.detail.createRoutine")}
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
              <h3 style={{ margin: 0, fontSize: 18 }}>{t("clients.detail.progressCheckinsTitle")}</h3>

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
          <h2 style={{ margin: "0 0 8px" }}>{t("clients.detail.historyTitle")}</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {t("clients.detail.historyDescription")}
          </p>
        </div>

        <section style={contentPanelStyles}>
          <div
            style={{
              display: "grid",
              gap: 6,
            }}
          >
            <span style={sectionEyebrowStyles}>{t("clients.detail.timeline")}</span>
            <h3 style={{ margin: 0, fontSize: 22 }}>{t("clients.detail.clientActivityHistory")}</h3>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              {t("clients.detail.clientActivityHistoryDescription")}
            </p>
          </div>

          {canAccessMemberships ? (
            <section style={{ display: "grid", gap: 14 }}>
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 18 }}>{t("clients.detail.membershipHistory")}</h4>
                <p style={{ margin: 0, color: "var(--muted)" }}>{t("clients.detail.membershipHistoryDescription")}</p>
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
                  <h4 style={{ margin: "0 0 6px", fontSize: 18 }}>{t("clients.detail.paymentHistory")}</h4>
                  <p style={{ margin: 0, color: "var(--muted)" }}>{t("clients.detail.paymentHistoryDescription")}</p>
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
                  <h4 style={{ margin: "0 0 6px", fontSize: 18 }}>{t("clients.detail.checkinHistory")}</h4>
                  <p style={{ margin: 0, color: "var(--muted)" }}>{t("clients.detail.checkinHistoryDescription")}</p>
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
          <h2 style={{ margin: "0 0 8px" }}>{t("clients.detail.operationsTitle")}</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {t("clients.detail.operationsDescription")}
          </p>
        </div>

          <section style={{ ...contentPanelStyles, gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={sectionEyebrowStyles}>{t("clients.detail.actions")}</span>
              <h3 style={{ margin: 0, fontSize: 22 }}>{t("clients.detail.quickOperations")}</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                {t("clients.detail.quickOperationsDescription")}
              </p>
            </div>

            {canAccessMemberships ? (
              <UtilityFormPanel
                title={t("clients.detail.assignMembership")}
                description={t("clients.detail.assignMembershipDescription")}
              >
                {activePlansError ? (
                  <p style={errorBoxStyles}>{activePlansError}</p>
                ) : (
                  <MembershipAssignmentForm
                    action={assignMembershipToClient.bind(null, client.id)}
                    plans={activePlans}
                    warningMessage={
                      membershipHistory.some((membership) => membership.remainingBalance > 0)
                        ? t("clients.detail.membershipDebtWarning")
                        : undefined
                    }
                  />
                )}
              </UtilityFormPanel>
            ) : null}

            {canAccessPayments ? (
              <UtilityFormPanel
                title={t("clients.detail.registerPayment")}
                description={t("clients.detail.registerPaymentDescription")}
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
                    label: `${membership.planName} · ${t("common.dateRange", { start: membership.startDate, end: membership.endDate })} · $${membership.remainingBalance.toFixed(2)} ${t("memberships.remainingBalance").toLowerCase()} · ${t(`common.status.${getMembershipLifecycleStatus(membership)}`)}`,
                    planName: membership.planName,
                    startDate: membership.startDate,
                    endDate: membership.endDate,
                    status: t(`common.status.${getMembershipLifecycleStatus(membership)}`),
                    planPrice: membership.planPrice,
                    totalPaid: membership.totalPaid,
                    remainingBalance: membership.remainingBalance,
                  })).filter((membership) => membership.remainingBalance > 0)}
                  submitLabel={t("clients.detail.registerPayment")}
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
                title={t("clients.detail.manualCheckin")}
                description={t("clients.detail.manualCheckinDescription")}
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
                    {t("clients.detail.checkinBlocked")}
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
  action,
  actions = [],
  description,
  descriptionNode,
  eyebrow,
  icon: Icon,
  metadata,
  status,
  title,
}: {
  action?: ReactNode;
  actions?: { href: string; label: string; variant?: "primary" | "secondary" }[];
  description?: string;
  descriptionNode?: ReactNode;
  eyebrow: string;
  icon: LucideIcon;
  metadata: string[];
  status?: ReactNode;
  title: string;
}) {
  return (
    <article
      className="client-summary-card"
      style={{
        display: "grid",
        gap: 16,
        alignContent: "start",
        borderRadius: 18,
        border: "1px solid rgba(255, 255, 255, 0.11)",
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.022))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              flex: "0 0 auto",
              borderRadius: 12,
              color: "var(--accent-strong)",
              background: "rgba(181, 232, 197, 0.11)",
              border: "1px solid rgba(181, 232, 197, 0.18)",
            }}
          >
            <Icon size={18} strokeWidth={2.1} />
          </span>
          <span
            className="client-summary-card-text"
            style={{
              color: "var(--muted)",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </span>
        </div>
        {status}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <strong className="client-summary-card-text" style={{ fontSize: 21, lineHeight: 1.2 }}>{title}</strong>
        {descriptionNode ?? (
          <p className="client-summary-card-text" style={{ margin: 0, color: "var(--muted)", lineHeight: 1.55 }}>{description}</p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
          color: "var(--muted)",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {metadata.map((item) => (
          <span
            key={item}
            className="client-summary-card-text"
            style={{
              minWidth: 0,
              padding: "7px 9px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.045)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
            }}
          >
            {item}
          </span>
        ))}
      </div>

      <div className="client-summary-card-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "end" }}>
        {action}
        {actions.map((summaryAction) => (
          <Link
            key={`${summaryAction.href}-${summaryAction.label}`}
            href={summaryAction.href}
            className={summaryAction.variant === "primary" ? buttonPrimary : buttonSecondary}
          >
            {summaryAction.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

function PortalAccessEmailSummary({
  clientEmail,
  hasMismatch,
  portalEmail,
}: {
  clientEmail: string | null;
  hasMismatch: boolean;
  portalEmail: string | null;
}) {
  return (
    <div className="client-summary-card-text" style={{ display: "grid", gap: 8, color: "var(--muted)", lineHeight: 1.55 }}>
      {hasMismatch ? (
        <>
          <p className="client-summary-card-text break-words text-sm leading-relaxed" style={{ margin: 0 }}>
            Correo del cliente: <strong style={{ color: "inherit" }}>{clientEmail}</strong>
          </p>
          <p className="client-summary-card-text break-words text-sm leading-relaxed" style={{ margin: 0 }}>
            Correo de acceso al portal: <strong style={{ color: "inherit" }}>{portalEmail}</strong>
          </p>
          <p style={warningBoxStyles}>
            El correo del cliente no coincide con el correo de acceso al portal.
          </p>
        </>
      ) : (
        <p className="client-summary-card-text break-words text-sm leading-relaxed" style={{ margin: 0 }}>
          Correo de acceso al portal: <strong style={{ color: "inherit" }}>{portalEmail}</strong>
        </p>
      )}
    </div>
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

const warningBoxStyles: CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 12,
  background: "var(--warning-bg)",
  color: "var(--warning-fg)",
  fontWeight: 700,
  overflowWrap: "anywhere",
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

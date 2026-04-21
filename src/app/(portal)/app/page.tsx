import Link from "next/link";

import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";
import { getProgressCheckInsForPage } from "@/modules/coaching/services/progress-checkin-service";
import { getClientRoutineSummariesForPage } from "@/modules/coaching/services/routine-service";

export default async function PortalHomePage() {
  const { data: linkedClient } = await getLinkedClientForCurrentUser();

  if (!linkedClient) {
    return null;
  }

  const [
    { data: onboarding },
    { data: routines },
    { data: progressCheckIns },
  ] = await Promise.all([
    getOnboardingForPage(linkedClient.clientId),
    getClientRoutineSummariesForPage(linkedClient.clientId),
    getProgressCheckInsForPage(linkedClient.clientId),
  ]);

  const activeRoutine = routines.find((routine) => routine.status === "active") ?? null;
  const latestCheckIn = progressCheckIns[0] ?? null;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ margin: "0 0 8px" }}>
          Welcome, {linkedClient.firstName}
        </h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Your coaching portal shows your current routine, progress check-ins, and profile context.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <SummaryCard
          title="My Routine"
          value={activeRoutine ? activeRoutine.title : "No active routine"}
          helper={activeRoutine ? `${activeRoutine.dayCount} day blocks` : "Ask your coach for your latest plan"}
          href="/app/routine"
        />
        <SummaryCard
          title="My Progress"
          value={latestCheckIn ? latestCheckIn.checkinDate : "No check-ins yet"}
          helper={latestCheckIn ? `${latestCheckIn.photoTypes.length} photos attached` : "Progress updates will appear here"}
          href="/app/progress"
        />
        <SummaryCard
          title="My Profile"
          value={onboarding ? onboarding.goal : "No onboarding yet"}
          helper={onboarding ? `${onboarding.availableDays} training days per week` : "Your coaching context will appear here"}
          href="/app/profile"
        />
      </div>
    </div>
  );
}

function SummaryCard({
  helper,
  href,
  title,
  value,
}: {
  helper: string;
  href: string;
  title: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "grid",
        gap: 8,
        padding: 20,
        borderRadius: 20,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{title}</span>
      <strong style={{ fontSize: 20 }}>{value}</strong>
      <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>{helper}</span>
    </Link>
  );
}

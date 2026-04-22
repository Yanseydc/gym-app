import Link from "next/link";

import { getPortalText } from "@/lib/i18n/portal";
import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";
import { getProgressCheckInsForPage } from "@/modules/coaching/services/progress-checkin-service";
import { getClientRoutineSummariesForPage } from "@/modules/coaching/services/routine-service";

export default async function PortalHomePage() {
  const t = getPortalText();
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
      <header
        style={{
          display: "grid",
          gap: 10,
          padding: 24,
          borderRadius: 24,
          background:
            "linear-gradient(180deg, rgba(34, 41, 36, 0.98), rgba(24, 30, 26, 0.94))",
          border: "1px solid var(--border)",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Portal de coaching
        </span>
        <h1 style={{ margin: 0, fontSize: 32 }}>
          {t.home.welcome(linkedClient.firstName)}
        </h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.home.description}
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
          title={t.home.routineTitle}
          value={activeRoutine ? activeRoutine.title : t.home.routineEmptyValue}
          helper={activeRoutine ? t.home.routineDayBlocks(activeRoutine.dayCount) : t.home.routineEmptyHelper}
          href="/app/routine"
        />
        <SummaryCard
          title={t.home.progressTitle}
          value={latestCheckIn ? latestCheckIn.checkinDate : t.home.progressEmptyValue}
          helper={latestCheckIn ? t.home.progressPhotosAttached(latestCheckIn.photoTypes.length) : t.home.progressEmptyHelper}
          href="/app/progress"
        />
        <SummaryCard
          title={t.home.profileTitle}
          value={onboarding ? onboarding.goal : t.home.profileEmptyValue}
          helper={onboarding ? t.home.profileTrainingDays(onboarding.availableDays) : t.home.profileEmptyHelper}
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
          gap: 10,
          padding: 22,
          borderRadius: 22,
          border: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(29, 35, 30, 0.98), rgba(21, 26, 23, 0.94))",
          boxShadow: "0 12px 28px rgba(0, 0, 0, 0.14)",
          color: "inherit",
        }}
    >
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {title}
      </span>
      <strong style={{ fontSize: 22, lineHeight: 1.2 }}>{value}</strong>
      <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>{helper}</span>
      <span style={{ marginTop: 6, fontWeight: 700, color: "var(--accent-strong)" }}>
        Ver seccion
      </span>
    </Link>
  );
}

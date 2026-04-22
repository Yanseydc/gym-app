import { getPortalText } from "@/lib/i18n/portal";
import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";

export default async function PortalProfilePage() {
  const t = getPortalText();
  const { data: linkedClient } = await getLinkedClientForCurrentUser();

  if (!linkedClient) {
    return null;
  }

  const { data: onboarding } = await getOnboardingForPage(linkedClient.clientId);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.profile.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.profile.description}
        </p>
      </header>

      {!onboarding ? (
        <article
          style={{
            padding: 24,
            borderRadius: 24,
            border: "1px dashed var(--border)",
            background: "var(--surface)",
            color: "var(--muted)",
          }}
        >
          {t.profile.empty}
        </article>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <DetailItem label={t.profile.labels.weight} value={`${onboarding.weightKg} kg`} />
          <DetailItem label={t.profile.labels.height} value={`${onboarding.heightCm} cm`} />
          <DetailItem label={t.profile.labels.goal} value={onboarding.goal} fullWidth />
          <DetailItem label={t.profile.labels.availableDays} value={`${onboarding.availableDays} ${t.profile.perWeek}`} />
          <DetailItem label={t.profile.labels.availableSchedule} value={onboarding.availableSchedule} fullWidth />
          <DetailItem
            label={t.profile.labels.experienceLevel}
            value={t.profile.experienceLevels[onboarding.experienceLevel]}
          />
          <DetailItem label={t.profile.labels.injuriesNotes} value={onboarding.injuriesNotes || t.profile.noInjuries} fullWidth />
          <DetailItem label={t.profile.labels.notes} value={onboarding.notes || t.profile.noNotes} fullWidth />
        </div>
      )}
    </div>
  );
}

function DetailItem({
  fullWidth = false,
  label,
  value,
}: {
  fullWidth?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>{label}</span>
      <strong style={{ whiteSpace: "pre-wrap" }}>{value}</strong>
    </div>
  );
}

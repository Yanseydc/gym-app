import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";

export default async function PortalProfilePage() {
  const { data: linkedClient } = await getLinkedClientForCurrentUser();

  if (!linkedClient) {
    return null;
  }

  const { data: onboarding } = await getOnboardingForPage(linkedClient.clientId);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ margin: "0 0 8px" }}>My profile</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          This is the coaching context currently on file for your account.
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
          No onboarding information available yet.
        </article>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <DetailItem label="Weight" value={`${onboarding.weightKg} kg`} />
          <DetailItem label="Height" value={`${onboarding.heightCm} cm`} />
          <DetailItem label="Goal" value={onboarding.goal} fullWidth />
          <DetailItem label="Available days" value={`${onboarding.availableDays} / week`} />
          <DetailItem label="Available schedule" value={onboarding.availableSchedule} fullWidth />
          <DetailItem
            label="Experience level"
            value={onboarding.experienceLevel[0].toUpperCase() + onboarding.experienceLevel.slice(1)}
          />
          <DetailItem label="Injuries notes" value={onboarding.injuriesNotes || "No injuries noted"} fullWidth />
          <DetailItem label="Notes" value={onboarding.notes || "No notes"} fullWidth />
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

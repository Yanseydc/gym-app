import Link from "next/link";

import type { ClientOnboarding } from "@/modules/coaching/types";

export function ClientOnboardingCard({
  clientId,
  onboarding,
}: {
  clientId: string;
  onboarding: ClientOnboarding | null;
}) {
  if (!onboarding) {
    return (
      <article
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px dashed var(--border)",
          background: "var(--surface)",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Coaching onboarding</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            No onboarding captured yet for this client.
          </p>
        </div>

        <div>
          <Link
            href={`/dashboard/clients/${clientId}/onboarding/new`}
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 14,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Create onboarding
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article
      style={{
        display: "grid",
        gap: 20,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Coaching onboarding</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Latest onboarding snapshot used for coaching planning.
          </p>
        </div>

        <Link
          href={`/dashboard/clients/${clientId}/onboarding/edit`}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--surface-alt)",
            fontWeight: 700,
          }}
        >
          Edit onboarding
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <DetailItem label="Weight" value={`${onboarding.weightKg} kg`} />
        <DetailItem label="Height" value={`${onboarding.heightCm} cm`} />
        <DetailItem label="Available days" value={`${onboarding.availableDays} / week`} />
        <DetailItem
          label="Experience level"
          value={onboarding.experienceLevel[0].toUpperCase() + onboarding.experienceLevel.slice(1)}
        />
        <DetailItem label="Goal" value={onboarding.goal} fullWidth />
        <DetailItem label="Available schedule" value={onboarding.availableSchedule} fullWidth />
        <DetailItem label="Injuries notes" value={onboarding.injuriesNotes || "No injuries noted"} fullWidth />
        <DetailItem label="Notes" value={onboarding.notes || "No notes"} fullWidth />
      </div>
    </article>
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
        background: "rgba(239, 229, 212, 0.5)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>{label}</span>
      <strong style={{ whiteSpace: "pre-wrap" }}>{value}</strong>
    </div>
  );
}
